import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import {
  airForModelName,
  applyParamSpec,
  lookupParamSpec,
} from "@/lib/ai/image/spec-apply";
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

  // Most catalog models declare no maxImageInputs; requiring one would hide them all.
  const declaredMaxRefs = model.metadata?.maxImageInputs ?? 0;

  const supportsSize = endpoint === "image-generation";

  const maxReferenceImages =
    declaredMaxRefs > 0
      ? declaredMaxRefs
      : endpoint === "image-generation"
        ? 1
        : 0;

  const inferred: ImageModelDescriptor = {
    id: model.model_name,
    displayName: model.model_name,
    vendor: model.vendor,
    pricePerCall: model.is_fixed_price ? model.fixed_price : 0,
    isFree: model.is_free,
    // Every checkpoint control below is off unless the model's own param spec
    // turns it on: applyParamSpec reads the provider schema, which is the only
    // thing that knows whether a model takes steps, CFG or a scheduler.
    supportsNegativePrompt: false,
    supportsCfg: false,
    supportsSteps: false,
    supportsGuidance: false,
    supportsSize,
    supportsLoraChain: false,
    supportsReferences: maxReferenceImages >= 1,
    maxReferenceImages,
    supportsSampler: false,
    // Runware folds sampler+scheduler into one field; the sampler control carries
    // it, and the spec's own enum overrides this list when it has one.
    samplers: RUNWARE_SCHEDULERS,
    schedulers: undefined,
    supportsHiresFix: false,
    supportsAdetailer: false,
    // Every capability below stays off until the model's own Runware schema turns it
    // on (applyParamSpec). Guessing them from the model NAME shipped wrong values:
    // lowercase output formats against an uppercase enum, a quality list missing
    // "auto", and watermark/background flags for fields the schema does not define.
    supportsQuality: false,
    supportsOutputFormat: false,
    supportsSeed: false,
    supportsStrength: false,
    supportsBackground: false,
    // "Default" lets the checkpoint pick rather than pinning a sampler the model
    // may reject.
    defaultParams: { width: 1024, height: 1024, steps: 20, sampler: "Default" },
    estimatedSeconds: 15,
    recommendedPromptStyle: "natural-language",
  };

  // Catalog rows carry no AIR, so a checkpoint resolves through its `series` (Pony,
  // Illustrious, SDXL, ...) - the architecture tier that covers arbitrary Civitai
  // checkpoints without a per-model entry. Provider-hosted rows have no series either,
  // so they resolve by published name. Only spec'd models change behaviour.
  const spec = lookupParamSpec(
    airForModelName(model.model_name),
    model.metadata?.series,
  );
  return spec ? applyParamSpec(inferred, spec) : inferred;
}

export function imageDescriptors(
  pricing: PricingCatalogModel[],
): ImageModelDescriptor[] {
  return pricing
    .map(inferDescriptor)
    .filter((d): d is ImageModelDescriptor => d !== null);
}
