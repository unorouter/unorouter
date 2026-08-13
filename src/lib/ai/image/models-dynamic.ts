import { releaseTs } from "@/lib/api/pricing";
import type { ProcessedModel } from "@/lib/api/pricing";
import {
  STATIC_IMAGE_MODELS,
  STATIC_IMAGE_MODELS_BY_ID,
  type ImageModelDescriptor,
} from "@/lib/ai/image/models";
import { applyParamSpec, lookupParamSpec } from "@/lib/ai/image/spec-apply";

export type SyncImageEndpoint = "image-generation" | "openai" | "gemini";

const ENDPOINT_PRECEDENCE: SyncImageEndpoint[] = [
  "image-generation",
  "openai",
  "gemini",
];

export function chooseEndpoint(types: string[]): SyncImageEndpoint | null {
  for (const candidate of ENDPOINT_PRECEDENCE) {
    if (types.includes(candidate)) return candidate;
  }
  return null;
}

// Diffusion support is detected from the ROUTING GROUP (the channel serving the model),
// not the vendor label: vendor is name-inferred and misclaims checkpoints, which would
// strip every diffusion control they support.
const DIFFUSION_GROUP_PATTERN = /runware/i;

// Runware's own scheduler vocabulary, one `<sampler> <schedule>` string per entry. Every
// entry was verified against a live generation; omissions are provider rejections. It
// rejects ComfyUI spellings (euler_ancestral, normal) outright.
export const RUNWARE_SCHEDULERS = [
  "Default",
  "Euler",
  "Euler Karras",
  "Euler a",
  "Euler Beta",
  "DPM++ 2M",
  "DPM++ 2M Karras",
  "DPM++ 2M Exponential",
  "DPM++ 2M Beta",
  "DPM++ SDE",
  "DPM++ SDE Karras",
  "DPM++ SDE Exponential",
  "DPM++ SDE Beta",
  "DPM++ 2M SDE",
  "DPM++ 2M SDE Karras",
  "DPM++ 2M SDE Exponential",
  "DDIM",
  "UniPC",
  "UniPC Karras",
  "Heun",
  "Heun Karras",
  "LMS",
  "LMS Karras",
  "LCM",
];

// An unknown scheduler is a hard upstream rejection, so the submit path checks first.
export function isRunwareScheduler(value: string): boolean {
  return RUNWARE_SCHEDULERS.includes(value);
}

function isDiffusionModel(model: ProcessedModel): boolean {
  return (model.enableGroups ?? []).some((g) =>
    DIFFUSION_GROUP_PATTERN.test(g),
  );
}

function vendorKnobs(modelName: string): {
  quality?: readonly string[];
  outputFormat?: readonly string[];
  watermark?: boolean;
  seed?: boolean;
  strength?: boolean;
  background?: boolean;
} {
  const m = modelName.toLowerCase();

  if (m.startsWith("gpt-image") || m === "chatgpt-image-latest") {
    return {
      quality: ["low", "medium", "high"],
      outputFormat: ["png", "webp", "jpeg"],
      background: true,
    };
  }
  if (m.startsWith("gpt-4o-image")) {
    return { quality: ["standard", "hd"] };
  }
  if (m.startsWith("gemini") && m.includes("image")) {
    return { quality: ["1K", "2K"] };
  }
  if (m.startsWith("doubao-seedream") || m.startsWith("doubao-seededit")) {
    return { watermark: true, seed: true };
  }
  if (
    m.startsWith("flux-") ||
    m.startsWith("black-forest-labs/flux") ||
    m === "flux-pro-1.1-ultra"
  ) {
    return { outputFormat: ["png", "jpeg", "webp"], seed: true };
  }
  if (m.startsWith("wan2.5") || m.startsWith("wan2.6")) {
    return { strength: true, seed: true };
  }
  return {};
}

function inferDescriptor(model: ProcessedModel): ImageModelDescriptor | null {
  if (model.endpointTypes.includes("comfyui")) {
    const tmpl = STATIC_IMAGE_MODELS_BY_ID[model.name];
    if (!tmpl) return null;
    return {
      ...tmpl,
      pricePerCall: model.isFixedPrice ? model.fixedPrice : tmpl.pricePerCall,
      isFree: model.isFree,
    };
  }
  if (model.type !== "image") return null;
  const endpoint = chooseEndpoint(model.endpointTypes);
  if (!endpoint) return null;

  // Most catalog models declare no maxImageInputs; requiring one would hide them all.
  const declaredMaxRefs = model.metadata?.maxImageInputs ?? 0;

  const supportsSize = endpoint === "image-generation";
  const knobs = vendorKnobs(model.name);
  const diffusion = isDiffusionModel(model);

  // Diffusion checkpoints have no reference-image input: refs switch the request to
  // the multipart edits endpoint, which their channels cannot serve (instant 400).
  // Their image-input path is the img2img init image (seedImage).
  const maxReferenceImages = diffusion
    ? 0
    : declaredMaxRefs > 0
      ? declaredMaxRefs
      : endpoint === "image-generation"
        ? 1
        : 0;

  const inferred: ImageModelDescriptor = {
    id: model.name,
    family: "sync-image",
    displayName: model.name,
    vendor: model.vendor.name,
    pricePerCall: model.isFixedPrice ? model.fixedPrice : 0,
    isFree: model.isFree,
    supportsNegativePrompt: diffusion,
    supportsCfg: diffusion,
    // Hosted API models (FLUX.2 pro/max/klein, seedream, gpt-image) reject steps outright;
    // only the diffusion checkpoints take one. Verified against Runware's per-model schema.
    supportsSteps: diffusion,
    supportsGuidance: false,
    supportsSize,
    supportsLoraChain: diffusion,
    supportsReferences: maxReferenceImages >= 1,
    maxReferenceImages,
    supportsSampler: diffusion,
    // Runware folds sampler+scheduler into one field; the sampler control carries it.
    samplers: diffusion ? RUNWARE_SCHEDULERS : undefined,
    schedulers: undefined,
    // Hires and ADetailer are init-image renders under the hood, so both need strength.
    supportsHiresFix: diffusion,
    supportsAdetailer: diffusion,
    supportsQuality: !!knobs.quality,
    qualityChoices: knobs.quality,
    supportsOutputFormat: !!knobs.outputFormat,
    outputFormatChoices: knobs.outputFormat,
    supportsWatermark: knobs.watermark,
    supportsSeed: knobs.seed || diffusion,
    supportsStrength: knobs.strength || diffusion,
    supportsBackground: knobs.background,
    defaultParams: {
      width: 1024,
      height: 1024,
      steps: 20,
      // "Default" lets the checkpoint pick; prevents ComfyUI fallback values.
      ...(diffusion ? { sampler: "Default" } : {}),
    },
    estimatedSeconds: 15,
    recommendedPromptStyle: "natural-language",
  };

  // Catalog rows carry no AIR, so a checkpoint resolves through its `series` (Pony,
  // Illustrious, SDXL, ...) - the architecture tier that covers arbitrary Civitai
  // checkpoints without a per-model entry. Only spec'd models change behaviour.
  const spec = lookupParamSpec(null, model.metadata?.series);
  return spec ? applyParamSpec(inferred, spec) : inferred;
}

// Cached per pricing-array identity: React effects list the result as a dependency, and
// a fresh array per render would fire them every render.
const effectiveModelsCache = new WeakMap<
  ProcessedModel[],
  ImageModelDescriptor[]
>();

export function getEffectiveImageModels(
  pricing: ProcessedModel[] | undefined,
): ImageModelDescriptor[] {
  if (!pricing || pricing.length === 0) return STATIC_IMAGE_MODELS;
  const hit = effectiveModelsCache.get(pricing);
  if (hit) return hit;
  const computed = computeEffectiveImageModels(pricing);
  effectiveModelsCache.set(pricing, computed);
  return computed;
}

function computeEffectiveImageModels(
  pricing: ProcessedModel[],
): ImageModelDescriptor[] {
  const comfy: ImageModelDescriptor[] = [];
  const dynamic: { desc: ImageModelDescriptor; releasedAt: number }[] = [];
  const seen = new Set<string>();
  for (const model of pricing) {
    if (seen.has(model.name)) continue;
    const desc = inferDescriptor(model);
    if (!desc) continue;
    seen.add(model.name);
    if (model.endpointTypes.includes("comfyui")) comfy.push(desc);
    else dynamic.push({ desc, releasedAt: releaseTs(model) });
  }
  dynamic.sort((a, b) => {
    const diff = b.releasedAt - a.releasedAt;
    return diff !== 0
      ? diff
      : a.desc.displayName.localeCompare(b.desc.displayName);
  });
  return [...comfy, ...dynamic.map((d) => d.desc)];
}
