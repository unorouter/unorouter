import type { ImageModelId } from "@/lib/validation/image";

export type ImageModelDescriptor = {
  id: ImageModelId;
  displayName: string;
  pricePerCall: number;
  supportsNegativePrompt: boolean;
  supportsCfg: boolean;
  supportsGuidance: boolean;
  // Absent means "assume yes": every pre-existing descriptor predates this flag and the
  // form rendered steps unconditionally. Only a descriptor that explicitly sets false
  // (FLUX.2 pro/max/klein, which reject the field) loses the control.
  supportsSteps?: boolean;
  // Slider bounds from the model's own schema. Absent falls back to the form's generic
  // range; present means the provider's real limits, so a value cannot be out of range
  // (FLUX.2 flex accepts CFG 1.5-5, well inside the generic 0-15).
  stepsMin?: number;
  stepsMax?: number;
  cfgMin?: number;
  cfgMax?: number;
  supportsSize: boolean;
  supportsLoraChain: boolean;
  supportsReferences: boolean;
  supportsSampler: boolean;
  supportsHiresFix: boolean;
  supportsQuality?: boolean;
  qualityChoices?: readonly string[];
  supportsOutputFormat?: boolean;
  outputFormatChoices?: readonly string[];
  supportsSeed?: boolean;
  supportsStrength?: boolean;
  supportsBackground?: boolean;
  vendor?: string;
  maxReferenceImages?: number;
  isFree?: boolean;
  defaultParams: {
    width: number;
    height: number;
    steps: number;
    cfg?: number;
    guidance?: number;
    // Plain strings: the names belong to whichever backend serves the model, and the
    // samplers/schedulers lists below say which ones it accepts.
    sampler?: string;
    scheduler?: string;
  };
  fixedSize?: { width: number; height: number };
  samplers?: string[];
  schedulers?: string[];
  estimatedSeconds: number;
  recommendedPromptStyle: "natural-language" | "danbooru-tags";
  supportsAdetailer?: boolean;
  supportsEmbedding?: boolean;
  supportsVae?: boolean;
  supportsClipSkip?: boolean;
  tabs?: ReadonlyArray<"text2img" | "img2img" | "edit">;
};

// An id we cannot resolve borrows NOTHING but the shape: prompt and size are the
// only knobs every image model shares. Inheriting another model's capability
// flags renders that model's controls under a different name (an unresolved flux
// once showed the SDXL sampler and hid its own reference uploader, while the
// request still ran flux).
export function getModelDescriptor(id: ImageModelId): ImageModelDescriptor {
  return {
    id,
    displayName: id,
    supportsNegativePrompt: false,
    supportsCfg: false,
    supportsGuidance: false,
    supportsSize: true,
    supportsLoraChain: false,
    supportsReferences: false,
    supportsSampler: false,
    supportsHiresFix: false,
    supportsAdetailer: false,
    pricePerCall: 0,
    defaultParams: { width: 1024, height: 1024, steps: 20 },
    estimatedSeconds: 15,
    recommendedPromptStyle: "natural-language",
  };
}
