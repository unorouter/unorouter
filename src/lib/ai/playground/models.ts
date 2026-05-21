// Keep in sync with new-api-sync/config.yml and src/lib/validation/generation.ts.

import type { PlaygroundModel } from "@/lib/validation/playground";

export type ModelFamily = "sdxl" | "flux2" | "sync-image" | "edit";

export type PlaygroundModelDescriptor = {
  id: PlaygroundModel;
  family: ModelFamily;
  displayName: string;
  pricePerCall: number;
  supportsNegativePrompt: boolean;
  supportsCfg: boolean;
  supportsGuidance: boolean;
  supportsSize: boolean;
  supportsLoraChain: boolean;
  supportsReferences: boolean;
  supportsSampler: boolean;
  supportsHiresFix: boolean;
  supportsQuality?: boolean;
  qualityChoices?: readonly string[];
  supportsOutputFormat?: boolean;
  outputFormatChoices?: readonly string[];
  supportsWatermark?: boolean;
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
    sampler?: string;
    scheduler?: string;
  };
  fixedSize?: { width: number; height: number };
  samplers?: string[];
  schedulers?: string[];
  estimatedSeconds: number;
  recommendedPromptStyle: "natural-language" | "danbooru-tags";
  supportsImg2Img?: boolean;
  supportsUpscale?: boolean;
  supportsInpaint?: boolean;
  supportsAdetailer?: boolean;
  supportsEmbedding?: boolean;
  supportsControlNet?: boolean;
  supportsVae?: boolean;
  supportsLayerDiffusion?: boolean;
  supportsClipSkip?: boolean;
  // Missing `tabs` defaults to Text2Img-only in the picker.
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
    supportsImg2Img: true,
    supportsUpscale: true,
    supportsInpaint: true,
    supportsAdetailer: true,
    supportsEmbedding: true,
    supportsControlNet: true,
    supportsVae: true,
    // LayerDiffuse only patches SDXL base + SD1.5; Pony is an SDXL finetune so
    // it can't patch cleanly. Only `comfyui-sdxl-txt2img-lora` opts in.
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
    supportsImg2Img: true,
    supportsUpscale: true,
    supportsInpaint: true,
    supportsAdetailer: true,
    supportsEmbedding: true,
    supportsControlNet: true,
    supportsVae: true,
    // SDXL finetune: same LayerDiffuse constraint as Pony.
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
    tabs: ["text2img", "edit"],
  },
  // Edit-family static fallbacks shown before pricing loads. IDs match upstream
  // new-api canonical names; dynamic descriptor wins when pricing is present.
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
