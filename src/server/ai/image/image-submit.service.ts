import { buildBody, extractResults, loadRefs } from "@/lib/ai/image/dispatch";
import { getModelByName } from "@/server/models/pricing/pricing.service";
import { type SyncImageEndpoint } from "@/lib/ai/image/dispatch";
import { isValidAir } from "@/lib/ai/image/constants";
import { SYNC_IMAGE_ENDPOINTS } from "@/lib/ai/image/dispatch";
import { msg } from "@/lib/config/constants";
import type {
  GeneratedImage,
  ImageParams,
  LoraEntry,
  ImageSubmitBody,
} from "@/lib/validation/image";
import { logger } from "@/lib/utils/logger";
import { groupHeader } from "@/server/constants";
import type { PricingCatalogDetail } from "@/openapi";
import {
  adetailerCheckpoint,
  runAdetailerPass,
} from "@/server/ai/image/adetailer.service";
import { MAX_IMAGES_PER_GEN } from "@/lib/validation/image";
import {
  batchPlan,
  fetchGeneratedImage,
  formatSize,
  postImageRequest,
  sizeOf,
  type UpstreamSize,
} from "./upstream";
import {
  capReferences,
  filterLorasToCapabilities,
  filterParamsToCapabilities,
} from "./capabilities";

function imageCountFor(body: ImageSubmitBody): number {
  const n = body.params?.n ?? 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_IMAGES_PER_GEN, Math.floor(n));
}

// The provider spellings for the base knobs (CFGScale, scheduler as one field).
// Unknown keys are silently ignored upstream, so a wrong spelling means a dead control.
function baseDiffusionKnobs(
  params: Record<string, unknown>,
  acceptedSamplers: string[],
  bodyNegativePrompt?: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (bodyNegativePrompt) out.negativePrompt = bodyNegativePrompt;
  // Empty string means "untouched" in the form, but providers reject it as a real value.
  const copy = (key: string) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    out[key] = value;
  };
  copy("steps");
  copy("clipSkip");
  copy("negativePrompt");
  copy("strength");
  // guidance is the flux-family spelling of the same knob; cfg wins when both exist.
  const cfg = params.cfg ?? params.guidance;
  if (typeof cfg === "number") out.CFGScale = cfg;
  // One scheduler field upstream. Allowlisted because an unknown scheduler is a HARD
  // failure (old drafts still carry ComfyUI spellings); unrecognised falls back to the
  // model default instead of failing the request.
  // Validated against the model's OWN accepted list rather than a shared
  // vocabulary: a value outside it is a hard upstream rejection.
  const scheduler = [params.scheduler, params.sampler].find(
    (v): v is string =>
      typeof v === "string" &&
      !!v &&
      v !== "Default" &&
      acceptedSamplers.includes(v),
  );
  if (scheduler) out.scheduler = scheduler;
  return out;
}

// Init image, mask, and the hires overrides. A hires pass is the only render
// happening, so its denoise/steps REPLACE the base strength/steps.
function initImageKnobs(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const initImage = params.initImageUrl;
  if (typeof initImage !== "string" || !initImage) return out;
  out.seedImage = initImage;
  if (typeof params.hiresDenoise === "number") {
    out.strength = params.hiresDenoise;
  }
  if (typeof params.hiresSteps === "number") out.steps = params.hiresSteps;
  const mask = params.maskUrl;
  if (typeof mask === "string" && mask) out.maskImage = mask;
  return out;
}

// LoRA/embedding chains and the VAE; the provider keys each model by `model`.
function modelChainKnobs(
  params: Record<string, unknown>,
  loras: LoraEntry[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
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

// Diffusion knobs the OpenAI image schema has no field for; they ride as extra
// top-level keys and the gateway adaptor maps them onto the provider's own names.
function diffusionParams(
  mode: ImageSubmitBody["mode"],
  params: Record<string, unknown>,
  loras: LoraEntry[],
  extraParams: { air?: string } | undefined,
  acceptedSamplers: string[],
  bodyNegativePrompt?: string,
): Record<string, unknown> {
  return {
    // The passthrough checkpoint; without it every custom-civitai request runs the
    // channel's default model.
    ...(isValidAir(extraParams?.air) ? { air: extraParams.air } : {}),
    ...baseDiffusionKnobs(params, acceptedSamplers, bodyNegativePrompt),
    // A stale initImageUrl in a text2img request would silently turn it into
    // img2img of an old base; the mode the user chose wins over leftover params.
    ...(mode === "txt2img" ? {} : initImageKnobs(params)),
    ...modelChainKnobs(params, loras),
  };
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

type ResolvedModel = {
  info: PricingCatalogDetail;
  endpoint: SyncImageEndpoint;
};

async function resolveModel(model: string): Promise<ResolvedModel> {
  const info = await getModelByName(model);
  if (!info) {
    logger.warn("image model not in catalog", {
      context: "image.submit",
      model,
    });
    throw new Error(msg("ERRORS.NOT_FOUND"));
  }
  // Capabilities enforced server-side; a non-form caller must not smuggle knobs.
  const raw = info.metadata?.imageParams?.endpoint;
  const endpoint = SYNC_IMAGE_ENDPOINTS.find((e) => e === raw);
  if (!endpoint) {
    logger.warn("image model has no usable endpoint", {
      context: "image.submit",
      model,
      endpointTypes: info.supported_endpoint_types,
    });
    throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  }
  return { info, endpoint };
}

async function refineWithAdetailer(
  uri: string,
  body: ImageSubmitBody,
  params: ImageParams,
  loras: LoraEntry[],
  size: UpstreamSize | undefined,
): Promise<string> {
  const adetailer = params.adetailer;
  if (!adetailer || uri.startsWith("data:")) return uri;
  // ADetailer runs on the finished result, best-effort: any failure keeps the
  // original rather than losing a generation the user already paid for.
  const refined = await runAdetailerPass({
    imageUrl: uri,
    adetailer,
    checkpoint: adetailerCheckpoint(body),
    prompt: body.prompt,
    loras: adetailer.loras?.length ? adetailer.loras : loras,
    scheduler: params.scheduler,
    cfg: params.cfg,
    // Renders at the size actually requested, hires multiplier included.
    width: size?.width ?? 1024,
    height: size?.height ?? 1024,
  }).catch((err) => {
    logger.warn("adetailer pass errored", {
      context: "image.adetailer",
      error: String(err).slice(0, 200),
    });
    return null;
  });
  return refined ?? uri;
}

export type SubmitGenerationResult = {
  status: "success";
  images: GeneratedImage[];
  droppedParams: string[];
  /** Gateway request ids for this generation, used to look up what it actually cost. */
  requestIds: string[];
};

export async function submitGeneration(
  apiKey: string,
  body: ImageSubmitBody,
): Promise<SubmitGenerationResult> {
  const resolved = await resolveModel(body.model);
  // The detail row carries the same imageParams the capability gate reads.
  const descriptor = resolved.info;
  const endpoint = resolved.endpoint;

  const filtered = filterParamsToCapabilities(descriptor, body.params);
  const loras = filterLorasToCapabilities(descriptor, body.loras);
  const references = capReferences(descriptor, body.references);

  const params = filtered.params;
  const size = sizeOf(filtered.params);
  // References may be data URIs: the browser holds the bytes, there is no object storage.
  const refs = references.length
    ? await loadRefs(references.map((r) => r.url))
    : [];

  // A model served only by a non-default group 403s without naming that group.
  const routingGroup = resolveRoutingGroup(resolved.info.enable_groups);
  const plan = batchPlan(endpoint === "image-generation", imageCountFor(body));
  const sizeLabel = formatSize(size);

  const collected: GeneratedImage[] = [];
  const requestIds: string[] = [];
  for (let i = 0; i < plan.calls; i++) {
    const built = buildBody(endpoint, {
      model: body.model,
      prompt: body.prompt,
      size: sizeLabel,
      refs,
      n: plan.perCallN,
      quality: params.quality,
      outputFormat: params.outputFormat,
      watermark: params.watermark,
      background: params.background,
      strength: params.strength,
      // A pinned seed on a multi-image batch offsets per call, else every call
      // renders the identical image.
      seed: typeof params.seed === "number" ? params.seed + i : undefined,
      diffusion: diffusionParams(
        body.mode,
        params,
        loras,
        body.extraParams,
        resolved.info.metadata?.imageParams?.samplers ?? [],
        body.negativePrompt,
      ),
    });

    // Log what the provider ACTUALLY receives: the only way to tell a dropped knob
    // from a sent-and-ignored one.
    logger.info("image generation request", {
      context: "image.submit",
      model: body.model,
      endpoint,
      group: routingGroup ?? "auto",
      size: sizeLabel,
      n: plan.perCallN,
      call: i + 1,
      of: plan.calls,
      params: redactImageValues(
        built.kind === "json" ? JSON.parse(built.body) : params,
      ),
      loras: loras.map((l) => `${l.name}@${l.weight}`),
      refCount: refs.length,
    });

    const res = await postImageRequest(
      built,
      apiKey,
      groupHeader(routingGroup),
    );
    if (res.requestId) requestIds.push(res.requestId);

    for (const result of extractResults(endpoint, res.payload)) {
      const uri = await refineWithAdetailer(
        result.uri,
        body,
        params,
        loras,
        size,
      );
      collected.push(await fetchGeneratedImage(uri, apiKey, result.seed));
    }
  }

  if (collected.length === 0) {
    logger.warn("image generation returned no images", {
      context: "image.submit",
      model: body.model,
      endpoint,
    });
    throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  }

  return {
    status: "success",
    images: collected,
    droppedParams: filtered.dropped,
    requestIds,
  };
}
