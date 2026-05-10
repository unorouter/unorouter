// Single source of truth for per-model UI behavior. The generate form
// reads this descriptor for the selected model and conditionally hides
// or locks controls (Flux 2 has no negative prompt and is locked to
// 1024x1024; flux2-dev-compose is the only model that takes references).
//
// Keep in sync with new-api-sync/config.yml templates and
// src/lib/validation/generation.ts model union.

import type { GenerationModel } from "@/lib/validation/generation";

export type ModelFamily = "sdxl" | "flux2";

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
  },
  {
    id: "endgame",
    family: "sdxl",
    displayName: "Endgame",
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
  },
  {
    id: "comfyui-sdxl-txt2img-lora",
    family: "sdxl",
    displayName: "SDXL base + LoRA",
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
  },
  {
    id: "flux2-dev",
    family: "flux2",
    displayName: "Flux 2 dev",
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
  },
  {
    id: "flux2-dev-compose",
    family: "flux2",
    displayName: "Flux 2 compose (multi-reference)",
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
