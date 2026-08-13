import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ModelParamSpec } from "@/lib/ai/image/schema-spec";
import snapshot from "@/lib/ai/image/runware-schemas.json";

// Turns a Runware parameter spec into descriptor flags. The spec is authoritative: a
// control the schema does not list would be rejected upstream, so rendering it could only
// waste a generation. Where no spec resolves, the caller's own inference stands - a model
// we cannot look up keeps exactly the behaviour it had before this existed.

const SNAPSHOT = snapshot as {
  byAir: Record<string, ModelParamSpec>;
  byArchitecture: Record<string, ModelParamSpec>;
};

// The catalog labels a checkpoint's lineage with `series` ("Pony", "Illustrious", ...);
// Runware documents the same lineages as architecture slugs. This is the join between them,
// and it is what lets an arbitrary Civitai checkpoint resolve without a per-model entry.
const SERIES_TO_ARCHITECTURE: Record<string, string> = {
  sdxl: "sdxl",
  pony: "pony",
  illustrious: "illustrious",
  noobai: "noobai",
  "stable diffusion": "sd-1-5",
  flux: "flux-1-dev",
  hidream: "hidream-i1-dev",
};

// AIR is exact; architecture is the fallback tier. A model matching neither returns null
// and keeps the caller's own inference.
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
  // Runware labels variants off the base architecture ("pony_v7", "sdxl_lightning"), and
  // a variant takes the same parameters as its base. Falling back to the base beats
  // dropping every control because of a suffix we have not seen before.
  const base = key.split(/[_-]/)[0];
  const baseSlug = SERIES_TO_ARCHITECTURE[base] ?? base;
  return SNAPSHOT.byArchitecture[baseSlug] ?? null;
}

function numeric(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function applyParamSpec(
  base: ImageModelDescriptor,
  spec: ModelParamSpec,
): ImageModelDescriptor {
  const params = spec.params;
  const steps = params.steps;
  const cfg = params.CFGScale;
  const scheduler = params.scheduler;

  return {
    ...base,
    supportsSteps: "steps" in params,
    supportsCfg: "CFGScale" in params,
    supportsNegativePrompt: "negativePrompt" in params,
    supportsLoraChain: "lora" in params,
    supportsSampler: "scheduler" in params,
    // Schedulers are per-architecture; the schema enum is the accepted vocabulary, so a
    // value picked from it cannot be rejected the way a shared hardcoded list could.
    samplers:
      scheduler?.enum ?? ("scheduler" in params ? base.samplers : undefined),
    supportsReferences: spec.maxReferenceImages > 0,
    maxReferenceImages: spec.maxReferenceImages,
    supportsSeed: "seed" in params || base.supportsSeed,
    supportsStrength: "strength" in params,
    stepsMin: numeric(steps?.min),
    stepsMax: numeric(steps?.max),
    cfgMin: numeric(cfg?.min),
    cfgMax: numeric(cfg?.max),
    defaultParams: {
      ...base.defaultParams,
      ...(numeric(steps?.default) !== undefined
        ? { steps: numeric(steps?.default) }
        : {}),
      ...(numeric(cfg?.default) !== undefined
        ? { cfg: numeric(cfg?.default) }
        : {}),
    },
  };
}
