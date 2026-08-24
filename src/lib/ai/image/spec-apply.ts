import type { ImageParams } from "@/openapi";
import type { ModelParamSpec } from "@/lib/ai/image/schema-spec";
import snapshot from "@/lib/ai/image/runware-schemas.json";

// Where no spec resolves, the caller's own inference stands: a model that cannot be
// looked up keeps the behaviour it would have had without any snapshot.

const SNAPSHOT: {
  byAir: Record<string, ModelParamSpec>;
  byArchitecture: Record<string, ModelParamSpec>;
} = snapshot;

// The catalog labels lineage with `series` ("Pony", "Illustrious"); Runware uses
// architecture slugs. This join is what lets an arbitrary Civitai checkpoint resolve
// without a per-model entry.
const SERIES_TO_ARCHITECTURE: Record<string, string> = {
  sdxl: "sdxl",
  pony: "pony",
  illustrious: "illustrious",
  noobai: "noobai",
  "stable diffusion": "sd-1-5",
  flux: "flux-1-dev",
  hidream: "hidream-i1-dev",
};

// Provider-hosted catalog rows carry neither an AIR nor a series, so both tiers below miss
// and they fall back to generic diffusion inference: a Steps slider and a CFG field on
// FLUX.2 max, which rejects both. The published name is all those rows carry.
const MODEL_NAME_TO_AIR: Record<string, string> = {
  "flux.2-max": "bfl:7@1",
  "flux.2-pro": "bfl:5@1",
  "flux.2-flex": "bfl:6@1",
  "flux.2-dev": "runware:400@1",
  "flux.2-klein-9b": "runware:400@2",
  "flux.2-klein-4b": "runware:400@4",
};

export function airForModelName(
  name: string | null | undefined,
): string | null {
  if (!name) return null;
  return MODEL_NAME_TO_AIR[name.trim().toLowerCase()] ?? null;
}

// AIR is exact; architecture is the fallback tier.
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
  // Runware labels variants off the base architecture ("pony_v7", "sdxl_lightning") and a
  // variant takes its base's parameters, so an unseen suffix need not drop every control.
  const base = key.split(/[_-]/)[0];
  const baseSlug = SERIES_TO_ARCHITECTURE[base] ?? base;
  return SNAPSHOT.byArchitecture[baseSlug] ?? null;
}

function numeric(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

// Deliberately the same shape the gateway sends, so the form can merge a user-picked
// checkpoint onto the catalog row and every consumer keeps reading one field.
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
    // A checkpoint always runs the diffusion endpoint, which takes a size.
    endpoint: "image-generation",
    supportsSize: true,
    defaultWidth: 1024,
    defaultHeight: 1024,
    defaultSteps: numeric(params.steps?.default) ?? 20,
    defaultCfg: numeric(params.CFGScale?.default),
    defaultSampler: "Default",
  };
}
