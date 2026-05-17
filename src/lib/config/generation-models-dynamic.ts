// Dynamic descriptor synthesis for non-ComfyUI image models. Reads the
// pricing-summary output (ProcessedModel[]) and builds GenerationModelDescriptor
// entries for any image model declaring metadata.maxImageInputs >= 6 and a
// supported endpoint we know how to route. The form merges these with the
// 5 hardcoded ComfyUI templates so the dropdown stays unified.

import type { ProcessedModel } from "@/lib/api/pricing";
import {
  GENERATION_MODELS,
  GENERATION_MODELS_BY_ID,
  type GenerationModelDescriptor,
} from "@/lib/config/generation-models";

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

// Vendor-knob heuristics derived from the new-api relay adapters
// (relay/channel/{openai,gemini,bytedance,xai,...}/adaptor.go). Each
// adapter cherry-picks specific fields off ImageRequest; the form should
// only render controls whose value will actually reach the upstream API.
function vendorKnobs(modelName: string): {
  quality?: readonly string[];
  outputFormat?: readonly string[];
  watermark?: boolean;
  seed?: boolean;
  strength?: boolean;
  background?: boolean;
} {
  const m = modelName.toLowerCase();

  // OpenAI gpt-image family — accepts quality/output_format/background.
  if (m.startsWith("gpt-image") || m === "chatgpt-image-latest") {
    return {
      quality: ["low", "medium", "high"],
      outputFormat: ["png", "webp", "jpeg"],
      background: true,
    };
  }
  // OpenAI gpt-4o-image — quality only, no format/background per adapter.
  if (m.startsWith("gpt-4o-image")) {
    return { quality: ["standard", "hd"] };
  }
  // Gemini -image-preview — adapter maps quality -> imageSize (1K/2K).
  if (m.startsWith("gemini") && m.includes("image")) {
    return { quality: ["1K", "2K"] };
  }
  // ByteDance / Doubao — full passthrough; watermark + seed are the
  // semantically meaningful ones.
  if (m.startsWith("doubao-seedream") || m.startsWith("doubao-seededit")) {
    return { watermark: true, seed: true };
  }
  // Black Forest Labs Flux — output_format is universal across BFL endpoints.
  if (
    m.startsWith("flux-") ||
    m.startsWith("black-forest-labs/flux") ||
    m === "flux-pro-1.1-ultra"
  ) {
    return { outputFormat: ["png", "jpeg", "webp"], seed: true };
  }
  // Alibaba wan2.5-i2i — strength + seed.
  if (m.startsWith("wan2.5") || m.startsWith("wan2.6")) {
    return { strength: true, seed: true };
  }
  // xAI Grok image — adapter explicitly drops size/quality/style; nothing
  // else to surface beyond prompt.
  return {};
}

export function inferDescriptor(
  model: ProcessedModel,
): GenerationModelDescriptor | null {
  // ComfyUI workflows are not OpenAI/Gemini-style sync image endpoints. The
  // model name maps to a hardcoded workflow descriptor (samplers, schedulers,
  // size, lora knobs - all workflow-specific). Surface only when pricing
  // declares a ComfyUI endpoint, i.e. an active ComfyUI channel exists.
  if (model.endpointTypes.includes("comfyui")) {
    const tmpl = GENERATION_MODELS_BY_ID[model.name];
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

  const declaredMaxRefs = model.metadata?.maxImageInputs ?? 0;
  // Include the model when it advertises 6-ref compose (Matic's workload)
  // OR it's a free image generator worth surfacing for casual use
  // (e.g. NVIDIA's flux.1-schnell/flux.1-dev which don't declare refs).
  if (declaredMaxRefs < 6 && !model.isFree) return null;

  // OAI image-generation endpoint accepts a `size` parameter; chat- and
  // gemini-based image models size implicitly via the prompt.
  const supportsSize = endpoint === "image-generation";
  const knobs = vendorKnobs(model.name);

  // References cap: when metadata is silent, assume the upstream image-edit
  // endpoint supports a single ref (img2img-style). Models declaring an
  // explicit maxImageInputs (>=1) honor that. Chat/gemini-only sync models
  // without metadata get 0 (uploader hidden) since their adapter wouldn't
  // know what to do with a ref bytes payload.
  const maxReferenceImages =
    declaredMaxRefs > 0
      ? declaredMaxRefs
      : endpoint === "image-generation"
        ? 1
        : 0;

  return {
    id: model.name,
    family: "sync-image",
    displayName: model.name,
    // Vendor name from /api/pricing — VendorIcon does a lowercased
    // substring match so "OpenAI", "Google", "ByteDance" all resolve.
    vendor: model.vendor.name,
    pricePerCall: model.isFixedPrice ? model.fixedPrice : 0,
    isFree: model.isFree,
    supportsNegativePrompt: false,
    supportsCfg: false,
    supportsGuidance: false,
    supportsSize,
    supportsLoraChain: false,
    // The references uploader renders when the model can take at least
    // one reference image. Free text-to-image models with no metadata
    // (e.g. NVIDIA flux.1-schnell on chat/gemini-only endpoints) get
    // maxReferenceImages=0 and the uploader hides.
    supportsReferences: maxReferenceImages >= 1,
    maxReferenceImages,
    supportsSampler: false,
    supportsHiresFix: false,
    supportsQuality: !!knobs.quality,
    qualityChoices: knobs.quality,
    supportsOutputFormat: !!knobs.outputFormat,
    outputFormatChoices: knobs.outputFormat,
    supportsWatermark: knobs.watermark,
    supportsSeed: knobs.seed,
    supportsStrength: knobs.strength,
    supportsBackground: knobs.background,
    defaultParams: {
      width: 1024,
      height: 1024,
      steps: 20,
    },
    estimatedSeconds: 15,
    recommendedPromptStyle: "natural-language",
    nsfwDefault: false,
  };
}

export function getEffectiveGenerationModels(
  pricing: ProcessedModel[] | undefined,
): GenerationModelDescriptor[] {
  // No pricing payload yet (initial load / network failure): fall back to the
  // hardcoded set so the UI has something to render. Once pricing arrives the
  // list becomes fully pricing-driven and reflects channel state in new-api.
  if (!pricing || pricing.length === 0) return GENERATION_MODELS;
  const comfy: GenerationModelDescriptor[] = [];
  const dynamic: GenerationModelDescriptor[] = [];
  const seen = new Set<string>();
  for (const model of pricing) {
    if (seen.has(model.name)) continue;
    const desc = inferDescriptor(model);
    if (!desc) continue;
    seen.add(model.name);
    if (model.endpointTypes.includes("comfyui")) comfy.push(desc);
    else dynamic.push(desc);
  }
  dynamic.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return [...comfy, ...dynamic];
}
