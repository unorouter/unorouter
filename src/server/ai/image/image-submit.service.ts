import {
  buildBody,
  extractResults,
  loadRefs,
} from "@/lib/ai/playground/dispatch";
import { getPricingSummary } from "@/lib/api/pricing-cache";
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
  // A hires pass renders the same image larger. There is no separate upscale parameter on
  // an inference request, so the multiplier becomes the requested size and the source image
  // rides along as the init image; the provider re-diffuses at the new size, which adds
  // detail rather than just resampling. The gateway snaps to its own dimension rules.
  const scale = typeof p.hiresUpscale === "number" ? p.hiresUpscale : 1;
  if (scale <= 1) return `${p.width}x${p.height}`;
  return `${Math.round(p.width * scale)}x${Math.round(p.height * scale)}`;
}

// `<publisher>:<modelId>@<versionId>`. Checked here as well as in the gateway because this
// value selects the model that runs: anything malformed must be dropped rather than
// forwarded, and a caller must not be able to smuggle a path or a URL through it.
const AIR_PATTERN = /^[a-z0-9_-]+:\d+@\d+$/i;

// Knobs the OpenAI image schema has no field for. They ride as extra top-level keys and the
// gateway adaptor maps them onto the provider's own names.
function diffusionParams(
  params: Record<string, unknown>,
  loras: LoraEntry[],
  extraParams: Record<string, unknown> | undefined,
  // The negative prompt is a TOP-LEVEL body field, not a param, so the copy() below could
  // never see it and it never reached the provider at all. Every generation ran with no
  // negative prompt no matter what the user typed.
  bodyNegativePrompt?: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (bodyNegativePrompt) out.negativePrompt = bodyNegativePrompt;
  // The checkpoint for a passthrough model. It rides in extraParams because it is not a
  // generation parameter, and without forwarding it every custom-civitai request silently
  // ran the channel's default checkpoint instead of the one the user resolved.
  const air = extraParams?.air;
  if (typeof air === "string" && AIR_PATTERN.test(air)) out.air = air;
  // An empty string is how the form spells "untouched", but providers read it as a real
  // value and reject it: Runware answers invalidNegativePrompt / invalidScheduler rather
  // than falling back to its own default. Absent has to stay absent.
  const copy = (key: string) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    out[key] = value;
  };
  copy("steps");
  copy("clipSkip");
  // The provider spells this CFGScale. Sent as `cfg` it was accepted and ignored (an unknown
  // key raises no error), so the slider moved nothing and every render used the model's own
  // default guidance. Same failure the scheduler had.
  const cfg = params.cfg;
  if (typeof cfg === "number") out.CFGScale = cfg;
  // The sampler control carries the BACKEND's scheduler vocabulary (Runware takes one field,
  // not a separate sampler and scheduler), so it has to arrive as `scheduler`. Sent as
  // `sampler` it was silently dropped: Runware ignores the unknown key without an error, so
  // every pick fell back to the default and the choice looked like it did nothing.
  //
  // ALLOWLISTED, because an unknown scheduler is a HARD failure (invalidScheduler), unlike
  // most knobs here which are ignored. Old drafts still carry ComfyUI spellings like
  // "normal"/"euler_ancestral" from a previous default, and those 500'd every generation
  // until the user cleared their draft. An unrecognised value now falls back to the model's
  // own default instead of failing the request.
  const scheduler = [params.scheduler, params.sampler].find(
    (v): v is string =>
      typeof v === "string" && !!v && v !== "Default" && isRunwareScheduler(v),
  );
  if (scheduler) out.scheduler = scheduler;
  copy("negativePrompt");
  copy("strength");
  // The form names these after the UI concept; the adaptor reads the provider's own
  // spelling, so the rename happens here rather than in the form or the gateway.
  const initImage = params.initImageUrl;
  if (typeof initImage === "string" && initImage) out.seedImage = initImage;
  // A hires pass is an init-image render at a larger size, so its denoise IS the strength
  // of that pass. Only meaningful with a source image, and it wins over a plain strength
  // because the user set it more recently, from the hires control.
  const hiresDenoise = params.hiresDenoise;
  if (typeof hiresDenoise === "number" && initImage) {
    out.strength = hiresDenoise;
  }
  // Likewise the hires pass has its own step count; it is the only render happening, so it
  // replaces the base steps rather than adding a second pass.
  const hiresSteps = params.hiresSteps;
  if (typeof hiresSteps === "number" && initImage) out.steps = hiresSteps;
  const mask = params.maskUrl;
  if (typeof mask === "string" && mask) out.maskImage = mask;
  if (loras.length) {
    // `lora`, not `loras`, and the entry key is `model`, not `name`. The old spelling was
    // accepted and ignored, so a whole LoRA chain silently did nothing to the render.
    out.lora = loras.map((l) => ({ model: l.name, weight: l.weight }));
  }
  // Neither of these was forwarded at all, so both pickers were decorative. Same entry
  // shape as LoRAs: the provider keys the model by `model`.
  const embeddings = params.embeddings;
  if (Array.isArray(embeddings) && embeddings.length) {
    out.embeddings = embeddings
      .filter((e): e is { name: string; weight?: number } => !!e?.name)
      .map((e) => ({ model: e.name, weight: e.weight ?? 1 }));
  }
  const vae = params.vae;
  // "automatic" is the form's way of spelling "leave it to the checkpoint", and the
  // provider has no such VAE: sending it would be rejected as invalidVae.
  if (typeof vae === "string" && vae && vae !== "automatic" && vae !== "none") {
    out.vae = vae;
  }
  return out;
}

// Image inputs are base64 data URIs measured in megabytes. Logging one would bury the line
// that matters, so they become a size marker while every other value stays verbatim.
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

// The gateway routes on the caller's own group unless one is named. Prefer leaving that
// alone when a shared group can serve the model, and only pin a specific group when the
// model lives exclusively in one.
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
  const summary = await getPricingSummary();

  const info = summary.byName.get(body.model);
  if (!info) throw new Error(`model ${body.model} not in catalog`);
  const endpoint = chooseEndpoint(info.endpointTypes ?? []);
  if (!endpoint) {
    throw new Error(`model ${body.model} declares no supported endpoint`);
  }

  // Enforce the model's declared capabilities server-side. The form gates the same flags, but
  // a request that did not come from the form must not be able to smuggle unsupported knobs.
  const descriptor = getEffectiveGenerationModels(summary.models).find(
    (d) => d.id === body.model,
  );
  if (!descriptor) throw new Error(`model ${body.model} is not generatable`);

  const filtered = filterParamsToCapabilities(descriptor, body.params);
  const loras = filterLorasToCapabilities(descriptor, body.loras);
  const references = capReferences(descriptor, body.references);

  const params = filtered.params as Record<string, unknown>;
  const size = paramsToSize(filtered.params);
  // References may be data URIs: the browser holds the bytes and there is no object storage.
  const refs = references.length
    ? await loadRefs(references.map((r) => r.url))
    : [];

  // A model served only by a non-default routing group (every dedicated image provider) is
  // unreachable without naming that group, so the request 403s as "no access to model".
  // Chat solves this with a user-facing group picker; here the model's own group list is
  // enough, and "auto" is left to the gateway when the default group already serves it.
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

    // What the provider ACTUALLY receives, which is the only way to tell a knob that was
    // dropped from one that was sent and ignored. Image payloads carry base64 data URIs, so
    // they are summarised rather than logged.
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
      throw new Error(`upstream ${res.status}: ${text.slice(0, 300)}`);
    }
    // The gateway bills a GPU-time provider on what the generation actually cost, so the
    // real charge is only knowable from its own log row, keyed by this id.
    const requestId = res.headers.get("x-oneapi-request-id");
    if (requestId) requestIds.push(requestId);
    const results = extractResults(endpoint, JSON.parse(text));
    for (const result of results) {
      // ADetailer redraws faces or hands AFTER the image exists, so it runs here on the
      // finished result. Best-effort: a detector that finds nothing, or a failed pass,
      // keeps the original rather than losing a generation the user already paid for.
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
          // The pass redraws the same canvas, so it renders at the SIZE ACTUALLY REQUESTED,
          // which already carries any hires multiplier.
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
