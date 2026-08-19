import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { PricingCatalogModel } from "@/openapi";

export type SyncImageEndpoint = "image-generation" | "openai" | "gemini";

// Order matters: chooseEndpoint picks the first a model serves. Doubles as the
// upstream ?endpoint= filter, so the catalog never returns a row this cannot submit.
export const ENDPOINT_PRECEDENCE: SyncImageEndpoint[] = [
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

export function inferDescriptor(
  model: PricingCatalogModel,
): ImageModelDescriptor | null {
  if (model.type !== "image") return null;
  const endpoint = chooseEndpoint(model.supported_endpoint_types);
  if (!endpoint) return null;

  // Resolved by the sync from the provider's own schema. Absent means unresolved,
  // so every control stays off rather than guessing one the model would reject.
  const p = model.metadata?.imageParams;
  const supportsSize = endpoint === "image-generation";
  // A resolved spec is authoritative, INCLUDING its zero: an SDXL checkpoint takes
  // no reference images, so falling back to a default there would offer an uploader
  // the model rejects.
  const maxReferenceImages = p
    ? p.maxReferenceImages
    : (model.metadata?.maxImageInputs ??
      (endpoint === "image-generation" ? 1 : 0));

  return {
    id: model.model_name,
    displayName: model.model_name,
    vendor: model.vendor,
    pricePerCall: model.is_fixed_price ? model.fixed_price : 0,
    isFree: model.is_free,
    supportsSize,
    supportsReferences: maxReferenceImages >= 1,
    maxReferenceImages,
    supportsNegativePrompt: p?.supportsNegativePrompt ?? false,
    supportsCfg: p?.supportsCfg ?? false,
    supportsSteps: p?.supportsSteps ?? false,
    supportsSampler: p?.supportsSampler ?? false,
    supportsLoraChain: p?.supportsLoraChain ?? false,
    supportsSeed: p?.supportsSeed ?? false,
    supportsStrength: p?.supportsStrength ?? false,
    supportsHiresFix: p?.supportsHiresFix ?? false,
    supportsAdetailer: p?.supportsAdetailer ?? false,
    supportsGuidance: false,
    // The schema enum is the accepted vocabulary, so a value picked from it cannot
    // be rejected the way a shared hardcoded list could. A resolved spec with no
    // enum means the model takes no sampler at all.
    samplers: p ? (p.samplers ?? undefined) : RUNWARE_SCHEDULERS,
    schedulers: undefined,
    supportsOutputFormat: !!p?.outputFormatChoices?.length,
    outputFormatChoices: p?.outputFormatChoices ?? undefined,
    supportsQuality: !!p?.qualityChoices?.length,
    qualityChoices: p?.qualityChoices ?? undefined,
    supportsBackground: !!p?.backgroundChoices?.length,
    stepsMin: p?.steps?.min ?? undefined,
    stepsMax: p?.steps?.max ?? undefined,
    cfgMin: p?.cfg?.min ?? undefined,
    cfgMax: p?.cfg?.max ?? undefined,
    // "Default" lets the checkpoint pick rather than pinning a sampler the model
    // may reject.
    defaultParams: {
      width: 1024,
      height: 1024,
      steps: p?.steps?.default ?? 20,
      ...(p?.cfg?.default != null ? { cfg: p.cfg.default } : {}),
      sampler: "Default",
    },
    estimatedSeconds: 15,
    recommendedPromptStyle: "natural-language",
  };
}

export function imageDescriptors(
  pricing: PricingCatalogModel[],
): ImageModelDescriptor[] {
  return pricing
    .map(inferDescriptor)
    .filter((d): d is ImageModelDescriptor => d !== null);
}
