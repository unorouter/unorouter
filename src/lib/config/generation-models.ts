// Single source of truth for per-model UI behavior. The generate form
// reads this descriptor for the selected model and conditionally hides
// or locks controls (Flux 2 has no negative prompt and is locked to
// 1024x1024; flux2-dev-compose is the only model that takes references).
//
// Keep in sync with new-api-sync/config.yml templates and
// src/lib/validation/generation.ts model union.

import type { GenerationModel } from "@/lib/validation/generation";

export type ModelFamily = "sdxl" | "flux2" | "sync-image" | "edit";

export type GenerationModelDescriptor = {
  id: GenerationModel;
  family: ModelFamily;
  displayName: string;
  // USD per call. Mirrors the price in new-api-sync/config.yml; the
  // server enforces the actual debit via dollarsToQuota.
  pricePerCall: number;
  supportsNegativePrompt: boolean;
  supportsCfg: boolean;
  supportsGuidance: boolean;
  supportsSize: boolean;
  supportsLoraChain: boolean;
  supportsReferences: boolean;
  supportsSampler: boolean;
  // Hires fix (denoise + upscale) is wired through the SDXL templates'
  // LatentUpscaleBy + 2nd KSampler pass (config.yml nodes 11/12).
  // Defaults to a passthrough (denoise=0, scale=1) so the 2nd pass is
  // a ~2s no-op when the user doesn't enable the toggle. Flux 2 has no
  // equivalent and stays false.
  supportsHiresFix: boolean;
  // Sync-image-only knobs surfaced from each vendor's relay adapter.
  // Each flag drives a single form control; the dispatch layer inserts
  // the value into the upstream body shape per endpoint kind.
  supportsQuality?: boolean;
  qualityChoices?: readonly string[];
  supportsOutputFormat?: boolean;
  outputFormatChoices?: readonly string[];
  supportsWatermark?: boolean;
  supportsSeed?: boolean;
  supportsStrength?: boolean;
  supportsBackground?: boolean;
  // Vendor identifier passed to <VendorIcon vendor=...>. Lowercased
  // substring lookup against @lobehub/icons. Optional — falls back to
  // an alphabet badge.
  vendor?: string;
  // Upper bound on references[] entries the model can usefully accept.
  // Drives the uploader's max-files cap. Optional — when undefined the
  // form treats it as 6 for ComfyUI compose templates and 1 otherwise.
  maxReferenceImages?: number;
  // Surface a "Free" badge in the picker. Mirrors the chat model
  // selector's behavior. ComfyUI templates always carry a price; the
  // dynamic helper sets this from ProcessedModel.isFree.
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
  // SDXL family samplers; flux2 ignores this and uses KSamplerSelect.
  samplers?: string[];
  schedulers?: string[];
  // Approximate warm-worker generation time used for ETA badges.
  estimatedSeconds: number;
  // Drives a hint in the prompt textarea; the model isn't enforced.
  recommendedPromptStyle: "natural-language" | "danbooru-tags";
  // Default for the row's nsfw flag. NSFW gens are owner-only by
  // policy: the gallery filters them out and setVisibility() rejects
  // "public" for any nsfw=true row. Pony / Endgame default true; vanilla
  // SDXL + Flux 2 default false. User can override per submission.
  nsfwDefault: boolean;
  // ---------------------------------------------------------------------
  // Phase 2-4 capability flags. Each gates a specific UI section in the
  // studio. Defaults are conservative (undefined = false); SDXL-family
  // descriptors opt in explicitly. Edit-family descriptors (Kontext,
  // gpt-image-1 edits, Gemini 3 image-preview) opt into multi-image-ref
  // but not the SDXL knobs (no Clip Skip/ENSD/A1111).
  // ---------------------------------------------------------------------
  supportsImg2Img?: boolean;
  supportsUpscale?: boolean;
  supportsInpaint?: boolean;
  supportsAdetailer?: boolean;
  supportsEmbedding?: boolean;
  supportsControlNet?: boolean;
  supportsVae?: boolean;
  supportsLayerDiffusion?: boolean;
  supportsClipSkip?: boolean;
  supportsPromptEncoder?: boolean;
  // Tab gating. Each descriptor declares which top-level tabs it can
  // appear in. Picker filters by the active tab. A model with no `tabs`
  // is assumed Text2Img-only, matching v1 behavior.
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

export const GENERATION_MODELS: GenerationModelDescriptor[] = [
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
    // Pony is the SDXL-family workhorse: opt in to every studio knob the
    // ComfyUI worker can handle on this checkpoint.
    supportsImg2Img: true,
    supportsUpscale: true,
    supportsInpaint: true,
    supportsAdetailer: true,
    supportsEmbedding: true,
    supportsControlNet: true,
    supportsVae: true,
    supportsLayerDiffusion: true,
    supportsClipSkip: true,
    supportsPromptEncoder: true,
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
    supportsLayerDiffusion: true,
    supportsClipSkip: true,
    supportsPromptEncoder: true,
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
    supportsPromptEncoder: true,
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
    // Flux 2 dev: no SDXL-specific knobs (no Clip Skip / ENSD / A1111 /
    // Ella / Layer Diffusion). Worker doesn't expose Img2Img/Inpaint on
    // this template either.
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
    // Compose is typically used for character-driven scenes; keep on
    // by default so the publish toggle is hidden until the user opts
    // out per submission.
    nsfwDefault: true,
    // Compose is multi-reference image-edit-style; surface it under
    // both Text2Img (still works as a generator) and Edit.
    tabs: ["text2img", "edit"],
  },
  // ---------------------------------------------------------------------
  // Edit-family static descriptors. Multi-image-reference instruction-edit
  // models that route through the OpenAI / Gemini sync-image endpoints.
  // These are also surfaced by getEffectiveGenerationModels() when their
  // pricing rows declare metadata.maxImageInputs >= 6, but we list them
  // here so the Edit tab always has at least one default option visible
  // even before the pricing payload loads.
  //
  // The IDs match upstream new-api canonical names (see new-api-sync
  // modelMapping). Pricing comes from the dynamic descriptor when the
  // pricing payload is present; static prices below are fallback only.
  // ---------------------------------------------------------------------
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

const BY_ID: Record<GenerationModel, GenerationModelDescriptor> =
  Object.fromEntries(GENERATION_MODELS.map((m) => [m.id, m])) as Record<
    GenerationModel,
    GenerationModelDescriptor
  >;

export function getModelDescriptor(
  id: GenerationModel,
): GenerationModelDescriptor {
  return BY_ID[id] ?? GENERATION_MODELS[0];
}
