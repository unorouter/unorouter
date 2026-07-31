import {
  buildBody,
  extractResults,
  loadRefs,
} from "@/lib/ai/playground/dispatch";
import { getPricingSummary } from "@/lib/api/pricing-cache";
import {
  chooseEndpoint,
  getEffectiveGenerationModels,
} from "@/lib/ai/playground/models-dynamic";
import { downloadGenerationBytes } from "@/lib/config/safe-fetch";
import type {
  GeneratedImage,
  LoraEntry,
  PlaygroundSubmitBody,
} from "@/lib/validation/playground";
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
  return p.width && p.height ? `${p.width}x${p.height}` : undefined;
}

// Knobs the OpenAI image schema has no field for. They ride as extra top-level keys and the
// gateway adaptor maps them onto the provider's own names.
function diffusionParams(
  params: Record<string, unknown>,
  loras: LoraEntry[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // An empty string is how the form spells "untouched", but providers read it as a real
  // value and reject it: Runware answers invalidNegativePrompt / invalidScheduler rather
  // than falling back to its own default. Absent has to stay absent.
  const copy = (key: string) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    out[key] = value;
  };
  copy("steps");
  copy("cfg");
  copy("sampler");
  copy("scheduler");
  copy("clipSkip");
  copy("negativePrompt");
  copy("strength");
  // The form names these after the UI concept; the adaptor reads the provider's own
  // spelling, so the rename happens here rather than in the form or the gateway.
  const initImage = params.initImageUrl;
  if (typeof initImage === "string" && initImage) out.seedImage = initImage;
  const mask = params.maskUrl;
  if (typeof mask === "string" && mask) out.maskImage = mask;
  if (loras.length) {
    out.loras = loras.map((l) => ({ name: l.name, weight: l.weight }));
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
      diffusion: diffusionParams(params, loras),
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
      const fetched = await downloadGenerationBytes(result.uri, apiKey);
      collected.push({
        resultUrl: result.uri.startsWith("data:") ? null : result.uri,
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
