import type { ImageParams } from "@/openapi";
import type { ModelParamSpec } from "@/lib/ai/image/schema-spec";
import snapshot from "@/lib/ai/image/runware-schemas.json";

const SNAPSHOT: {
  byAir: Record<string, ModelParamSpec>;
  byArchitecture: Record<string, ModelParamSpec>;
} = snapshot;

// Catalog `series` ("Pony", "Illustrious") to Runware architecture slug.
const SERIES_TO_ARCHITECTURE: Record<string, string> = {
  sdxl: "sdxl",
  pony: "pony",
  illustrious: "illustrious",
  noobai: "noobai",
  "stable diffusion": "sd-1-5",
  flux: "flux-1-dev",
  hidream: "hidream-i1-dev",
};

// Provider-hosted rows carry neither AIR nor series, so both lookup tiers miss and they
// fall back to generic diffusion inference, offering Steps and CFG that FLUX.2 rejects.

export function lookupParamSpec(
  air: string | null | undefined,
  series: string | null | undefined,
): ModelParamSpec | null {
  if (air && SNAPSHOT.byAir[air]) return SNAPSHOT.byAir[air];
  if (!series) return null;
  const key = series.trim().toLowerCase();
  const mapped = SERIES_TO_ARCHITECTURE[key] ?? key;
  const direct =
    SNAPSHOT.byArchitecture[mapped] ?? SNAPSHOT.byArchitecture[key];
  if (direct) return direct;
  // Runware variant slugs ("pony_v7", "sdxl_lightning") inherit the base architecture.
  const base = key.split(/[_-]/)[0];
  const baseSlug = SERIES_TO_ARCHITECTURE[base] ?? base;
  return SNAPSHOT.byArchitecture[baseSlug] ?? null;
}

function numeric(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function specToImageParams(spec: ModelParamSpec): ImageParams {
  const params = spec.params;
  const vendorParam = (name: string) =>
    Object.entries(spec.providerSettings).find(
      ([key]) => key.split(".")[1] === name,
    )?.[1];

  return {
    supportsNegativePrompt: "negativePrompt" in params,
    supportsCfg: "CFGScale" in params,
    supportsSteps: "steps" in params,
    supportsSampler: "scheduler" in params,
    supportsLoraChain: "lora" in params,
    supportsSeed: "seed" in params,
    supportsStrength: "strength" in params,
    supportsHiresFix: "hiresFix" in params,
    supportsAdetailer: "ultralytics" in params,
    samplers: params.scheduler?.enum,
    steps: { min: numeric(params.steps?.min), max: numeric(params.steps?.max) },
    cfg: {
      min: numeric(params.CFGScale?.min),
      max: numeric(params.CFGScale?.max),
    },
    maxReferenceImages: spec.maxReferenceImages,
    supportsReferences: spec.maxReferenceImages > 0,
    supportsSeedImage: spec.supportsSeedImage,
    supportsMaskImage: spec.supportsMaskImage,
    outputFormatChoices: params.outputFormat?.enum,
    qualityChoices: vendorParam("quality")?.enum,
    backgroundChoices: vendorParam("background")?.enum,
    endpoint: "image-generation",
    supportsSize: true,
    defaultWidth: 1024,
    defaultHeight: 1024,
    defaultSteps: numeric(params.steps?.default) ?? 20,
    defaultCfg: numeric(params.CFGScale?.default),
    defaultSampler: "Default",
  };
}
