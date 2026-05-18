// Builds PlaygroundModelDescriptor entries from pricing-summary
// (ProcessedModel[]) for any image model with metadata.maxImageInputs >= 6 and
// a supported endpoint. Merged with the hardcoded ComfyUI templates so the
// dropdown stays unified.

import type { ProcessedModel } from "@/lib/api/pricing";
import {
  PLAYGROUND_MODELS,
  PLAYGROUND_MODELS_BY_ID,
  type PlaygroundModelDescriptor,
} from "@/lib/playground/models";

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

// Each new-api relay adapter (relay/channel/.../adaptor.go) cherry-picks
// specific fields off ImageRequest; render only controls whose value will
// actually reach the upstream API.
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
  // Gemini adapter maps quality to imageSize (1K/2K).
  if (m.startsWith("gemini") && m.includes("image")) {
    return { quality: ["1K", "2K"] };
  }
  // Doubao adapter is a full passthrough; watermark + seed are the
  // semantically meaningful ones.
  if (m.startsWith("doubao-seedream") || m.startsWith("doubao-seededit")) {
    return { watermark: true, seed: true };
  }
  // output_format is universal across BFL endpoints.
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
  // xAI Grok adapter explicitly drops size/quality/style.
  return {};
}

export function inferDescriptor(
  model: ProcessedModel,
): PlaygroundModelDescriptor | null {
  // ComfyUI workflow descriptors are hardcoded; surface only when pricing
  // declares a ComfyUI endpoint (an active ComfyUI channel exists).
  if (model.endpointTypes.includes("comfyui")) {
    const tmpl = PLAYGROUND_MODELS_BY_ID[model.name];
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
  // Include 6-ref compose models OR free generators worth surfacing for
  // casual use (NVIDIA flux.1-schnell/dev don't declare refs).
  if (declaredMaxRefs < 6 && !model.isFree) return null;

  // image-generation endpoint accepts a `size` parameter; chat/gemini image
  // models size implicitly via the prompt.
  const supportsSize = endpoint === "image-generation";
  const knobs = vendorKnobs(model.name);

  // When metadata is silent, image-generation defaults to single ref
  // (img2img-style); chat/gemini-only sync models get 0 (uploader hidden)
  // since their adapter wouldn't know what to do with a ref bytes payload.
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
    // VendorIcon does a lowercased substring match so "OpenAI", "Google",
    // "ByteDance" all resolve.
    vendor: model.vendor.name,
    pricePerCall: model.isFixedPrice ? model.fixedPrice : 0,
    isFree: model.isFree,
    supportsNegativePrompt: false,
    supportsCfg: false,
    supportsGuidance: false,
    supportsSize,
    supportsLoraChain: false,
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
): PlaygroundModelDescriptor[] {
  // Fall back to the hardcoded set when no pricing payload is available so
  // the UI has something to render.
  if (!pricing || pricing.length === 0) return PLAYGROUND_MODELS;
  const comfy: PlaygroundModelDescriptor[] = [];
  const dynamic: PlaygroundModelDescriptor[] = [];
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
