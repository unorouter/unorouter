import { buildBody, extractResults, loadRefs } from "@/lib/ai/image/dispatch";
import { getModelByName } from "@/server/models/pricing/pricing.service";
import {
  chooseEndpoint,
  inferDescriptor,
  isRunwareScheduler,
  type SyncImageEndpoint,
} from "@/lib/ai/image/models-dynamic";
import { isValidAir } from "@/lib/ai/image/constants";
import { msg } from "@/lib/config/constants";
import type {
  GeneratedImage,
  LoraEntry,
  ImageSubmitBody,
} from "@/lib/validation/image";
import { logger } from "@/lib/utils/logger";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { PricingCatalogDetail } from "@/openapi";
import {
  adetailerCheckpoint,
  runAdetailerPass,
} from "@/server/ai/image/adetailer.service";
import type { AdetailerParams } from "@/lib/validation/image";
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
  const scheduler = [params.scheduler, params.sampler].find(
    (v): v is string =>
      typeof v === "string" && !!v && v !== "Default" && isRunwareScheduler(v),
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
  bodyNegativePrompt?: string,
): Record<string, unknown> {
  return {
    // The passthrough checkpoint; without it every custom-civitai request runs the
    // channel's default model.
    ...(isValidAir(extraParams?.air) ? { air: extraParams.air } : {}),
    ...baseDiffusionKnobs(params, bodyNegativePrompt),
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
  descriptor: ImageModelDescriptor;
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
  const endpoint = chooseEndpoint(info.supported_endpoint_types ?? []);
  // Capabilities enforced server-side; a non-form caller must not smuggle knobs.
  const descriptor = inferDescriptor(info);
  if (!endpoint || !descriptor) {
    logger.warn("image model has no usable endpoint", {
      context: "image.submit",
      model,
      endpointTypes: info.supported_endpoint_types,
    });
    throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  }
  return { info, descriptor, endpoint };
}

async function refineWithAdetailer(
  uri: string,
  body: ImageSubmitBody,
  params: Record<string, unknown>,
  loras: LoraEntry[],
  size: UpstreamSize | undefined,
): Promise<string> {
  const adetailer = params.adetailer as AdetailerParams | undefined;
  if (!adetailer || uri.startsWith("data:")) return uri;
  // ADetailer runs on the finished result, best-effort: any failure keeps the
  // original rather than losing a generation the user already paid for.
  const refined = await runAdetailerPass({
    imageUrl: uri,
    adetailer,
    checkpoint: adetailerCheckpoint(body),
    prompt: body.prompt,
    negativePrompt: params.negativePrompt as string | undefined,
    loras: adetailer.loras?.length ? adetailer.loras : loras,
    scheduler: params.scheduler as string | undefined,
    cfg: params.cfg as number | undefined,
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
  const descriptor = resolved.descriptor;
  const endpoint = resolved.endpoint;

  const filtered = filterParamsToCapabilities(descriptor, body.params);
  const loras = filterLorasToCapabilities(descriptor, body.loras);
  const references = capReferences(descriptor, body.references);

  const params = filtered.params as Record<string, unknown>;
  const size = sizeOf(filtered.params);
  // References may be data URIs: the browser holds the bytes, there is no object storage.
  const refs = references.length
    ? await loadRefs(references.map((r) => r.url))
    : [];

  // A model served only by a non-default group 403s without naming that group.
  const routingGroup = resolveRoutingGroup(resolved.info.enable_groups);
  const plan = batchPlan(endpoint === "image-generation", imageCountFor(body));

  const collected: GeneratedImage[] = [];
  const requestIds: string[] = [];
  for (let i = 0; i < plan.calls; i++) {
    const built = buildBody(endpoint, {
      model: body.model,
      prompt: body.prompt,
      size: formatSize(size),
      refs,
      n: plan.perCallN,
      quality: params.quality as string | undefined,
      outputFormat: params.outputFormat as string | undefined,
      watermark: params.watermark as boolean | undefined,
      background: params.background as string | undefined,
      strength: params.strength as number | undefined,
      // A pinned seed on a multi-image batch offsets per call, else every call
      // renders the identical image.
      seed: typeof params.seed === "number" ? params.seed + i : undefined,
      diffusion: diffusionParams(
        body.mode,
        params,
        loras,
        body.extraParams,
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
      size: formatSize(size),
      n: plan.perCallN,
      call: i + 1,
      of: plan.calls,
      params: redactImageValues(
        built.kind === "json"
          ? (JSON.parse(built.body) as Record<string, unknown>)
          : params,
      ),
      loras: loras.map((l) => `${l.name}@${l.weight}`),
      refCount: refs.length,
    });

    const res = await postImageRequest(
      built,
      apiKey,
      routingGroup ? { "X-Group": routingGroup } : {},
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
