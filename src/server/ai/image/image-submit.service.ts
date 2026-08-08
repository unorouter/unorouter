import {
  buildBody,
  extractResults,
  loadRefs,
} from "@/lib/ai/playground/dispatch";
import { getPricingSnapshot } from "@/server/models/pricing/pricing-snapshot";
import {
  chooseEndpoint,
  getEffectiveGenerationModels,
  isRunwareScheduler,
} from "@/lib/ai/playground/models-dynamic";
import { downloadGenerationBytes } from "@/lib/config/safe-fetch";
import type {
  GeneratedImage,
  LoraEntry,
  PlaygroundSubmitBody,
} from "@/lib/validation/playground";
import { logger } from "@/lib/utils/logger";
import {
  adetailerCheckpoint,
  runAdetailerPass,
} from "@/server/ai/image/adetailer.service";
import type { AdetailerParams } from "@/lib/validation/playground";
import { MAX_IMAGES_PER_GEN } from "@/lib/validation/playground";
import { upstreamApiUrl } from "@/server/constants";
import {
  capReferences,
  filterLorasToCapabilities,
  filterParamsToCapabilities,
} from "./capabilities";

// JSON bodies pass VERBATIM: the client extracts .error.message from them, and any
// prefix makes the string neither plain text nor parseable JSON.
function upstreamImageError(status: number, body: string): string {
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  return trimmed ? `${status}: ${trimmed.slice(0, 300)}` : `upstream ${status}`;
}

function imageCountFor(body: PlaygroundSubmitBody): number {
  const n = body.params?.n ?? 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_IMAGES_PER_GEN, Math.floor(n));
}

function paramsToSize(
  params: PlaygroundSubmitBody["params"],
): string | undefined {
  const p = params ?? {};
  if (!p.width || !p.height) return undefined;
  // A hires pass is the same render at a larger size: the multiplier becomes the
  // requested size and the source rides as init image (re-diffused, not resampled).
  const scale = typeof p.hiresUpscale === "number" ? p.hiresUpscale : 1;
  if (scale <= 1) return `${p.width}x${p.height}`;
  return `${Math.round(p.width * scale)}x${Math.round(p.height * scale)}`;
}

// `<publisher>:<modelId>@<versionId>`. Validated here as well as in the gateway: this
// value selects the model that runs, so nothing malformed may be forwarded.
const AIR_PATTERN = /^[a-z0-9_-]+:\d+@\d+$/i;

// Diffusion knobs the OpenAI image schema has no field for; they ride as extra top-level
// keys under the PROVIDER'S spellings (CFGScale, seedImage, lora[].model, scheduler).
// Unknown keys are silently ignored upstream, so a wrong spelling means a dead control.
function diffusionParams(
  params: Record<string, unknown>,
  loras: LoraEntry[],
  extraParams: Record<string, unknown> | undefined,
  bodyNegativePrompt?: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (bodyNegativePrompt) out.negativePrompt = bodyNegativePrompt;
  // The passthrough checkpoint; without it every custom-civitai request runs the
  // channel's default model.
  const air = extraParams?.air;
  if (typeof air === "string" && AIR_PATTERN.test(air)) out.air = air;
  // Empty string means "untouched" in the form, but providers reject it as a real value.
  const copy = (key: string) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    out[key] = value;
  };
  copy("steps");
  copy("clipSkip");
  const cfg = params.cfg;
  if (typeof cfg === "number") out.CFGScale = cfg;
  // One scheduler field upstream. Allowlisted because an unknown scheduler is a HARD
  // failure (old drafts still carry ComfyUI spellings); unrecognised falls back to the
  // model default instead of failing the request.
  const scheduler = [params.scheduler, params.sampler].find(
    (v): v is string =>
      typeof v === "string" && !!v && v !== "Default" && isRunwareScheduler(v),
  );
  if (scheduler) out.scheduler = scheduler;
  copy("negativePrompt");
  copy("strength");
  const initImage = params.initImageUrl;
  if (typeof initImage === "string" && initImage) out.seedImage = initImage;
  // A hires pass is the only render happening, so its denoise/steps REPLACE the base
  // strength/steps; only meaningful with a source image.
  const hiresDenoise = params.hiresDenoise;
  if (typeof hiresDenoise === "number" && initImage) {
    out.strength = hiresDenoise;
  }
  const hiresSteps = params.hiresSteps;
  if (typeof hiresSteps === "number" && initImage) out.steps = hiresSteps;
  const mask = params.maskUrl;
  if (typeof mask === "string" && mask) out.maskImage = mask;
  if (loras.length) {
    out.lora = loras.map((l) => ({ model: l.name, weight: l.weight }));
  }
  const embeddings = params.embeddings;
  if (Array.isArray(embeddings) && embeddings.length) {
    out.embeddings = embeddings
      .filter((e): e is { name: string; weight?: number } => !!e?.name)
      .map((e) => ({ model: e.name, weight: e.weight ?? 1 }));
  }
  const vae = params.vae;
  // "automatic"/"none" mean "leave it to the checkpoint"; the provider has no such VAE.
  if (typeof vae === "string" && vae && vae !== "automatic" && vae !== "none") {
    out.vae = vae;
  }
  return out;
}

// Base64 image inputs are megabytes; log them as size markers, everything else verbatim.
function redactImageValues(
  src: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === "string" && (v.startsWith("data:") || v.length > 512)) {
      out[k] = `<${v.length} chars>`;
    } else if (Array.isArray(v)) {
      out[k] = `<${v.length} items>`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Pin a routing group only when the model lives exclusively in a non-default one.
function resolveRoutingGroup(groups: string[] | undefined): string | undefined {
  const usable = (groups ?? []).filter((g) => g && g !== "auto");
  if (!usable.length) return undefined;
  if (usable.includes("default")) return undefined;
  return usable[0];
}

export type SubmitGenerationResult = {
  kind: "sync";
  status: "success";
  images: GeneratedImage[];
  droppedParams: string[];
  /** Gateway request ids for this generation, used to look up what it actually cost. */
  requestIds: string[];
};

export async function submitGeneration(
  apiKey: string,
  body: PlaygroundSubmitBody,
): Promise<SubmitGenerationResult> {
  const requestedCount = imageCountFor(body);
  const summary = await getPricingSnapshot();

  const info = summary.byName.get(body.model);
  if (!info) throw new Error(`model ${body.model} not in catalog`);
  const endpoint = chooseEndpoint(info.endpointTypes ?? []);
  if (!endpoint) {
    throw new Error(`model ${body.model} declares no supported endpoint`);
  }

  // Capabilities enforced server-side; a non-form caller must not smuggle knobs.
  const descriptor = getEffectiveGenerationModels(summary.models).find(
    (d) => d.id === body.model,
  );
  if (!descriptor) throw new Error(`model ${body.model} is not generatable`);

  const filtered = filterParamsToCapabilities(descriptor, body.params);
  const loras = filterLorasToCapabilities(descriptor, body.loras);
  const references = capReferences(descriptor, body.references);

  const params = filtered.params as Record<string, unknown>;
  const size = paramsToSize(filtered.params);
  // References may be data URIs: the browser holds the bytes, there is no object storage.
  const refs = references.length
    ? await loadRefs(references.map((r) => r.url))
    : [];

  // A model served only by a non-default group 403s without naming that group.
  const routingGroup = resolveRoutingGroup(info.enableGroups);

  const supportsNativeBatch = endpoint === "image-generation";
  const callsToMake = supportsNativeBatch ? 1 : requestedCount;
  const perCallN = supportsNativeBatch ? requestedCount : 1;

  const collected: GeneratedImage[] = [];
  const requestIds: string[] = [];
  for (let i = 0; i < callsToMake; i++) {
    const built = buildBody(endpoint, {
      model: body.model,
      prompt: body.prompt,
      size,
      refs,
      n: perCallN,
      quality: params.quality as string | undefined,
      outputFormat: params.outputFormat as string | undefined,
      watermark: params.watermark as boolean | undefined,
      background: params.background as string | undefined,
      strength: params.strength as number | undefined,
      seed: params.seed as number | undefined,
      diffusion: diffusionParams(
        params,
        loras,
        body.extraParams,
        body.negativePrompt,
      ),
    });

    // Log what the provider ACTUALLY receives: the only way to tell a dropped knob from
    // a sent-and-ignored one.
    logger.info("image generation request", {
      context: "image.submit",
      model: body.model,
      endpoint,
      group: routingGroup ?? "auto",
      size,
      n: perCallN,
      call: i + 1,
      of: callsToMake,
      params: redactImageValues(
        built.kind === "json"
          ? (JSON.parse(built.body) as Record<string, unknown>)
          : params,
      ),
      loras: loras.map((l) => `${l.name}@${l.weight}`),
      refCount: refs.length,
    });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      ...(routingGroup ? { "X-Group": routingGroup } : {}),
    };
    let res: Response;
    if (built.kind === "json") {
      headers["Content-Type"] = "application/json";
      res = await fetch(`${upstreamApiUrl}${built.path}`, {
        method: "POST",
        headers,
        body: built.body,
      });
    } else {
      res = await fetch(`${upstreamApiUrl}${built.path}`, {
        method: "POST",
        headers,
        body: built.form,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      throw new Error(upstreamImageError(res.status, text));
    }
    // The real charge is only knowable from the gateway's log row, keyed by this id.
    const requestId = res.headers.get("x-oneapi-request-id");
    if (requestId) requestIds.push(requestId);
    const results = extractResults(endpoint, JSON.parse(text));
    for (const result of results) {
      // ADetailer runs on the finished result, best-effort: any failure keeps the
      // original rather than losing a generation the user already paid for.
      let uri = result.uri;
      const adetailer = params.adetailer as AdetailerParams | undefined;
      if (adetailer && !uri.startsWith("data:")) {
        const refined = await runAdetailerPass({
          imageUrl: uri,
          adetailer,
          checkpoint: adetailerCheckpoint(body, params),
          prompt: body.prompt,
          negativePrompt: params.negativePrompt as string | undefined,
          loras: adetailer.loras?.length ? adetailer.loras : loras,
          scheduler: params.scheduler as string | undefined,
          cfg: params.cfg as number | undefined,
          // Renders at the size actually requested, hires multiplier included.
          width: Number(size?.split("x")[0]) || 1024,
          height: Number(size?.split("x")[1]) || 1024,
        }).catch((err) => {
          logger.warn("adetailer pass errored", {
            context: "image.adetailer",
            error: String(err).slice(0, 200),
          });
          return null;
        });
        if (refined) uri = refined;
      }
      const fetched = await downloadGenerationBytes(uri, apiKey);
      collected.push({
        resultUrl: uri.startsWith("data:") ? null : uri,
        base64: fetched.buffer.toString("base64"),
        mimeType: fetched.mime,
        sizeBytes: fetched.sizeBytes,
        seed: result.seed,
      });
    }
  }

  return {
    kind: "sync",
    status: "success",
    images: collected,
    droppedParams: filtered.dropped,
    requestIds,
  };
}
