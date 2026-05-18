// Source of truth for per-model UI behavior. Keep in sync with
// new-api-sync/config.yml templates and src/lib/validation/generation.ts.

import type { PlaygroundModel } from "@/lib/validation/playground";

export type ModelFamily = "sdxl" | "flux2" | "sync-image" | "edit";

export type PlaygroundModelDescriptor = {
  id: PlaygroundModel;
  family: ModelFamily;
  displayName: string;
  // USD per call. Server enforces the actual debit via dollarsToQuota.
  pricePerCall: number;
  supportsNegativePrompt: boolean;
  supportsCfg: boolean;
  supportsGuidance: boolean;
  supportsSize: boolean;
  supportsLoraChain: boolean;
  supportsReferences: boolean;
  supportsSampler: boolean;
  // SDXL: LatentUpscaleBy + 2nd KSampler pass (config.yml nodes 11/12).
  // Passthrough default (denoise=0, scale=1) keeps the 2nd pass a no-op when
  // the toggle is off. Flux 2 has no equivalent and stays false.
  supportsHiresFix: boolean;
  // Sync-image-only knobs surfaced from each vendor's relay adapter; dispatch
  // layer inserts the value into the upstream body shape per endpoint kind.
  supportsQuality?: boolean;
  qualityChoices?: readonly string[];
  supportsOutputFormat?: boolean;
  outputFormatChoices?: readonly string[];
  supportsWatermark?: boolean;
  supportsSeed?: boolean;
  supportsStrength?: boolean;
  supportsBackground?: boolean;
  // Lowercased substring lookup against @lobehub/icons; falls back to an
  // alphabet badge when missing.
  vendor?: string;
  // When undefined the form treats it as 6 for ComfyUI compose templates and
  // 1 otherwise.
  maxReferenceImages?: number;
  // Dynamic helper sets this from ProcessedModel.isFree; ComfyUI templates
  // always carry a price.
  isFree?: boolean;
  defaultParams: {
    width: number;
    height: number;
    steps: number;
    cfg?: number;
    guidance?: number;
    sampler?: string;
    scheduler?: string;
  };
  fixedSize?: { width: number; height: number };
  // flux2 ignores this and uses KSamplerSelect.
  samplers?: string[];
  schedulers?: string[];
  estimatedSeconds: number;
  recommendedPromptStyle: "natural-language" | "danbooru-tags";
  // NSFW gens are owner-only by policy: gallery filters them out and
  // setVisibility() rejects "public" for any nsfw=true row.
  nsfwDefault: boolean;
  // Studio capability flags. Defaults are conservative (undefined = false);
  // descriptors opt in explicitly. Edit-family descriptors opt into multi-
  // image references but not SDXL-only knobs.
  supportsImg2Img?: boolean;
  supportsUpscale?: boolean;
  supportsInpaint?: boolean;
  supportsAdetailer?: boolean;
  supportsEmbedding?: boolean;
  supportsControlNet?: boolean;
  supportsVae?: boolean;
  supportsLayerDiffusion?: boolean;
  supportsClipSkip?: boolean;
  // Picker filters by the active tab. Missing `tabs` defaults to Text2Img-only.
  tabs?: ReadonlyArray<"text2img" | "img2img" | "edit">;
};

const SDXL_SAMPLERS = [
  "euler",
  "euler_ancestral",
  "dpmpp_2m",
  "dpmpp_2m_sde",
  "dpmpp_3m_sde",
  "ddim",
  "uni_pc",
];

const SDXL_SCHEDULERS = ["normal", "karras", "exponential", "sgm_uniform"];

export const PLAYGROUND_MODELS: PlaygroundModelDescriptor[] = [
  {
    id: "pony",
    family: "sdxl",
    displayName: "Pony",
    vendor: "stability",
    pricePerCall: 0.06,
    supportsNegativePrompt: true,
    supportsCfg: true,
    supportsGuidance: false,
    supportsSize: true,
    supportsLoraChain: true,
    supportsReferences: false,
    supportsSampler: true,
    supportsHiresFix: true,
    defaultParams: {
      width: 1024,
      height: 1024,
      steps: 25,
      cfg: 7,
      sampler: "euler_ancestral",
      scheduler: "normal",
    },
    samplers: SDXL_SAMPLERS,
    schedulers: SDXL_SCHEDULERS,
    estimatedSeconds: 8,
    recommendedPromptStyle: "natural-language",
    nsfwDefault: true,
    supportsImg2Img: true,
    supportsUpscale: true,
    supportsInpaint: true,
    supportsAdetailer: true,
    supportsEmbedding: true,
    supportsControlNet: true,
    supportsVae: true,
    // Layer Diffusion weights are only compatible with SDXL base + SD1.5;
    // Pony is an SDXL finetune so LayerDiffuse can't patch cleanly. Only the
    // `comfyui-sdxl-txt2img-lora` descriptor opts in.
    supportsClipSkip: true,
    tabs: ["text2img", "img2img"],
  },
  {
    id: "endgame",
    family: "sdxl",
    displayName: "Endgame",
    vendor: "stability",
    pricePerCall: 0.08,
    supportsNegativePrompt: true,
    supportsCfg: true,
    supportsGuidance: false,
    supportsSize: true,
    supportsLoraChain: true,
    supportsReferences: false,
    supportsSampler: true,
    supportsHiresFix: true,
    defaultParams: {
      width: 1024,
      height: 1024,
      steps: 30,
      cfg: 5,
      sampler: "dpmpp_2m_sde",
      scheduler: "karras",
    },
    samplers: SDXL_SAMPLERS,
    schedulers: SDXL_SCHEDULERS,
    estimatedSeconds: 10,
    recommendedPromptStyle: "natural-language",
    nsfwDefault: true,
    supportsImg2Img: true,
    supportsUpscale: true,
    supportsInpaint: true,
    supportsAdetailer: true,
    supportsEmbedding: true,
    supportsControlNet: true,
    supportsVae: true,
    // SDXL finetune: same constraint as Pony, no LayerDiffuse.
    supportsClipSkip: true,
    tabs: ["text2img", "img2img"],
  },
  {
    id: "comfyui-sdxl-txt2img-lora",
    family: "sdxl",
    displayName: "SDXL base + LoRA",
    vendor: "stability",
    pricePerCall: 0.04,
    supportsNegativePrompt: true,
    supportsCfg: true,
    supportsGuidance: false,
    supportsSize: true,
    supportsLoraChain: true,
    supportsReferences: false,
    supportsSampler: true,
    supportsHiresFix: true,
    defaultParams: {
      width: 1024,
      height: 1024,
      steps: 25,
      cfg: 7,
      sampler: "euler",
      scheduler: "normal",
    },
    samplers: SDXL_SAMPLERS,
    schedulers: SDXL_SCHEDULERS,
    estimatedSeconds: 8,
    recommendedPromptStyle: "natural-language",
    nsfwDefault: false,
    supportsImg2Img: true,
    supportsUpscale: true,
    supportsInpaint: true,
    supportsAdetailer: true,
    supportsEmbedding: true,
    supportsControlNet: true,
    supportsVae: true,
    supportsLayerDiffusion: true,
    supportsClipSkip: true,
    tabs: ["text2img", "img2img"],
  },
  {
    id: "flux2-dev",
    family: "flux2",
    displayName: "Flux 2 dev",
    vendor: "flux",
    pricePerCall: 0.12,
    supportsNegativePrompt: false,
    supportsCfg: false,
    supportsGuidance: true,
    supportsSize: false,
    supportsLoraChain: false,
    supportsReferences: false,
    supportsSampler: false,
    supportsHiresFix: false,
    defaultParams: {
      width: 1024,
      height: 1024,
      steps: 20,
      guidance: 4.0,
    },
    fixedSize: { width: 1024, height: 1024 },
    estimatedSeconds: 45,
    recommendedPromptStyle: "natural-language",
    nsfwDefault: false,
    // No SDXL-specific knobs. Worker doesn't expose Img2Img/Inpaint here either.
    tabs: ["text2img"],
  },
  {
    id: "flux2-dev-compose",
    family: "flux2",
    displayName: "Flux 2 compose (multi-reference)",
    vendor: "flux",
    maxReferenceImages: 6,
    pricePerCall: 0.25,
    supportsNegativePrompt: false,
    supportsCfg: false,
    supportsGuidance: true,
    supportsSize: false,
    supportsLoraChain: false,
    supportsReferences: true,
    supportsSampler: false,
    supportsHiresFix: false,
    defaultParams: {
      width: 1024,
      height: 1024,
      steps: 20,
      guidance: 4.0,
    },
    fixedSize: { width: 1024, height: 1024 },
    estimatedSeconds: 60,
    recommendedPromptStyle: "natural-language",
    // Character-driven scenes: keep on by default so publish toggle hides
    // until the user opts out per submission.
    nsfwDefault: true,
    // Multi-reference image-edit-style; surface under Text2Img and Edit.
    tabs: ["text2img", "edit"],
  },
  // Edit-family static fallbacks visible even before pricing loads. IDs match
  // upstream new-api canonical names; static prices are fallback only and the
  // dynamic descriptor wins when pricing is present.
  {
    id: "flux-kontext-max",
    family: "edit",
    displayName: "FLUX.1 Kontext Max",
    vendor: "flux",
    pricePerCall: 0.08,
    supportsNegativePrompt: false,
    supportsCfg: false,
    supportsGuidance: true,
    supportsSize: false,
    supportsLoraChain: false,
    supportsReferences: true,
    supportsSampler: false,
    supportsHiresFix: false,
    maxReferenceImages: 4,
    defaultParams: { width: 1024, height: 1024, steps: 28, guidance: 2.5 },
    estimatedSeconds: 25,
    recommendedPromptStyle: "natural-language",
    nsfwDefault: false,
    tabs: ["edit"],
  },
  {
    id: "gpt-image-1",
    family: "edit",
    displayName: "GPT Image 1",
    vendor: "openai",
    pricePerCall: 0.04,
    supportsNegativePrompt: false,
    supportsCfg: false,
    supportsGuidance: false,
    supportsSize: true,
    supportsLoraChain: false,
    supportsReferences: true,
    supportsSampler: false,
    supportsHiresFix: false,
    supportsQuality: true,
    qualityChoices: ["low", "medium", "high"] as const,
    supportsOutputFormat: true,
    outputFormatChoices: ["png", "jpeg", "webp"] as const,
    supportsBackground: true,
    maxReferenceImages: 4,
    defaultParams: { width: 1024, height: 1024, steps: 1 },
    estimatedSeconds: 18,
    recommendedPromptStyle: "natural-language",
    nsfwDefault: false,
    tabs: ["edit"],
  },
  {
    id: "gemini-3-pro-image-preview",
    family: "edit",
    displayName: "Gemini 3 Pro Image",
    vendor: "gemini",
    pricePerCall: 0.04,
    supportsNegativePrompt: false,
    supportsCfg: false,
    supportsGuidance: false,
    supportsSize: true,
    supportsLoraChain: false,
    supportsReferences: true,
    supportsSampler: false,
    supportsHiresFix: false,
    supportsQuality: true,
    qualityChoices: ["1K", "2K", "4K"] as const,
    supportsSeed: true,
    maxReferenceImages: 4,
    defaultParams: { width: 1024, height: 1024, steps: 1 },
    estimatedSeconds: 15,
    recommendedPromptStyle: "natural-language",
    nsfwDefault: false,
    tabs: ["edit"],
  },
];

export const PLAYGROUND_MODELS_BY_ID: Record<
  string,
  PlaygroundModelDescriptor
> = Object.fromEntries(PLAYGROUND_MODELS.map((m) => [m.id, m]));

export function getModelDescriptor(
  id: PlaygroundModel,
): PlaygroundModelDescriptor {
  return PLAYGROUND_MODELS_BY_ID[id] ?? PLAYGROUND_MODELS[0];
}
