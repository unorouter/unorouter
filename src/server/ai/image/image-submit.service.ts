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

// Unknown keys are silently ignored upstream, so a misspelling is a dead control.
function baseDiffusionKnobs(
  params: Record<string, unknown>,
  acceptedSamplers: string[],
  bodyNegativePrompt?: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (bodyNegativePrompt) out.negativePrompt = bodyNegativePrompt;
  // Empty string means "untouched" in the form; providers reject it as a value.
  const copy = (key: string) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    out[key] = value;
  };
  copy("steps");
  copy("clipSkip");
  copy("negativePrompt");
  copy("strength");
  // guidance is the flux-family spelling of the same knob.
  const cfg = params.cfg ?? params.guidance;
  if (typeof cfg === "number") out.CFGScale = cfg;
  // A scheduler outside the model's OWN accepted list is a hard upstream
  // rejection, so an unrecognised one falls back to the default.
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
  // "automatic"/"none" are form sentinels; the provider has no such VAE.
  if (typeof vae === "string" && vae && vae !== "automatic" && vae !== "none") {
    out.vae = vae;
  }
  return out;
}

// Knobs the OpenAI image schema has no field for: they ride as extra top-level
// keys and the gateway adaptor maps them onto the provider's own names.
function diffusionParams(
  mode: ImageSubmitBody["mode"],
  params: Record<string, unknown>,
  loras: LoraEntry[],
  extraParams: { air?: string } | undefined,
  acceptedSamplers: string[],
  bodyNegativePrompt?: string,
): Record<string, unknown> {
  return {
    // Without this every custom-civitai request runs the channel's default model.
    ...(isValidAir(extraParams?.air) ? { air: extraParams.air } : {}),
    ...baseDiffusionKnobs(params, acceptedSamplers, bodyNegativePrompt),
    // A stale initImageUrl would silently turn txt2img into img2img of an old base.
    ...(mode === "txt2img" ? {} : initImageKnobs(params)),
    ...modelChainKnobs(params, loras),
  };
}

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
  // Best-effort: any failure keeps the original rather than losing a paid-for
  // generation.
  const refined = await runAdetailerPass({
    imageUrl: uri,
    adetailer,
    checkpoint: adetailerCheckpoint(body),
    prompt: body.prompt,
    loras: adetailer.loras?.length ? adetailer.loras : loras,
    scheduler: params.scheduler,
    cfg: params.cfg,
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
  requestIds: string[];
};

export async function submitGeneration(
  apiKey: string,
  body: ImageSubmitBody,
): Promise<SubmitGenerationResult> {
  const resolved = await resolveModel(body.model);
  const descriptor = resolved.info;
  const endpoint = resolved.endpoint;

  const filtered = filterParamsToCapabilities(descriptor, body.params);
  const loras = filterLorasToCapabilities(descriptor, body.loras);
  const references = capReferences(descriptor, body.references);

  const params = filtered.params;
  const size = sizeOf(filtered.params);
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
