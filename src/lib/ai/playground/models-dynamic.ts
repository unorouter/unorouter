import { releaseTs } from "@/lib/api/pricing";
import type { ProcessedModel } from "@/lib/api/pricing";
import {
  PLAYGROUND_MODELS,
  PLAYGROUND_MODELS_BY_ID,
  type PlaygroundModelDescriptor,
} from "@/lib/ai/playground/models";

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

// Diffusion checkpoints accept knobs the hosted image APIs do not: negative prompt, CFG,
// steps, LoRA chains. That is the whole reason for offering them, so getting this wrong
// silently strips the controls.
//
// Detected from the routing group, which names the channel actually serving the model. The
// vendor is only a display label and is inferred from the model name, so a checkpoint whose
// name a vendor matcher happens to claim (juggernaut-xl and wai-nsfw-illustrious-sdxl both
// read as "AI Horde") would otherwise lose every diffusion control it supports.
const DIFFUSION_GROUP_PATTERN = /runware/i;

// Runware's own scheduler vocabulary, each verified against a live generation. It rejects the
// ComfyUI spellings (euler_ancestral, normal) outright, so the choices have to come from the
// backend rather than from one shared list.
const RUNWARE_SCHEDULERS = [
  "Default",
  "Euler",
  "Euler a",
  "Euler Beta",
  "DPM++ 2M",
  "DPM++ 2M Karras",
  "DPM++ 2M SDE Karras",
  "DPM++ SDE Karras",
  "DDIM",
  "UniPC",
  "Heun",
  "LMS",
];

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

function inferDescriptor(
  model: ProcessedModel,
): PlaygroundModelDescriptor | null {
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

  // How many reference images a model accepts says nothing about whether it can generate
  // one. Requiring six here hid every paid model that does not declare the field, which is
  // almost all of them: 29 of 36 image models in the catalog, gpt-image-2 and the whole
  // Runware set included, leaving only free models in the picker.
  const declaredMaxRefs = model.metadata?.maxImageInputs ?? 0;

  const supportsSize = endpoint === "image-generation";
  const knobs = vendorKnobs(model.name);
  const diffusion = isDiffusionModel(model);

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
    vendor: model.vendor.name,
    pricePerCall: model.isFixedPrice ? model.fixedPrice : 0,
    isFree: model.isFree,
    supportsNegativePrompt: diffusion,
    supportsCfg: diffusion,
    supportsGuidance: false,
    supportsSize,
    supportsLoraChain: diffusion,
    supportsReferences: maxReferenceImages >= 1,
    maxReferenceImages,
    supportsSampler: diffusion,
    // Runware takes one scheduler field rather than a separate sampler and scheduler, so the
    // sampler control carries its vocabulary and the scheduler control stays empty.
    samplers: diffusion ? RUNWARE_SCHEDULERS : undefined,
    schedulers: undefined,
    // A hires pass re-renders the source at a larger size with a low denoise, which is an
    // init-image render and needs no separate upscale task. It therefore requires the same
    // support as img2img: a model that takes no init image cannot do it.
    supportsHiresFix: diffusion,
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
      // Named explicitly so the form does not fall back to a ComfyUI value the provider
      // rejects. "Default" lets the checkpoint pick its own.
      ...(diffusion ? { sampler: "Default" } : {}),
    },
    estimatedSeconds: 15,
    recommendedPromptStyle: "natural-language",
  };
}

export function getEffectiveGenerationModels(
  pricing: ProcessedModel[] | undefined,
): PlaygroundModelDescriptor[] {
  if (!pricing || pricing.length === 0) return PLAYGROUND_MODELS;
  const comfy: PlaygroundModelDescriptor[] = [];
  const dynamic: { desc: PlaygroundModelDescriptor; releasedAt: number }[] = [];
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
