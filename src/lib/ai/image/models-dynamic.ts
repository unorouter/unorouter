import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { PricingCatalogModel } from "@/openapi";

export type SyncImageEndpoint = "image-generation" | "openai" | "gemini";

// Order matters: chooseEndpoint picks the first a model serves. Doubles as the
// upstream ?endpoint= filter, so the catalog never returns a row this cannot submit.
export const ENDPOINT_PRECEDENCE: SyncImageEndpoint[] = [
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

// Runware's own scheduler vocabulary, one `<sampler> <schedule>` string per entry. Every
// entry was verified against a live generation; omissions are provider rejections. It
// rejects ComfyUI spellings (euler_ancestral, normal) outright.
export const RUNWARE_SCHEDULERS = [
  "Default",
  "Euler",
  "Euler Karras",
  "Euler a",
  "Euler Beta",
  "DPM++ 2M",
  "DPM++ 2M Karras",
  "DPM++ 2M Exponential",
  "DPM++ 2M Beta",
  "DPM++ SDE",
  "DPM++ SDE Karras",
  "DPM++ SDE Exponential",
  "DPM++ SDE Beta",
  "DPM++ 2M SDE",
  "DPM++ 2M SDE Karras",
  "DPM++ 2M SDE Exponential",
  "DDIM",
  "UniPC",
  "UniPC Karras",
  "Heun",
  "Heun Karras",
  "LMS",
  "LMS Karras",
  "LCM",
];

// An unknown scheduler is a hard upstream rejection, so the submit path checks first.
export function isRunwareScheduler(value: string): boolean {
  return RUNWARE_SCHEDULERS.includes(value);
}

export function inferDescriptor(
  model: PricingCatalogModel,
): ImageModelDescriptor | null {
  if (model.type !== "image") return null;
  const endpoint = chooseEndpoint(model.supported_endpoint_types);
  if (!endpoint) return null;

  // Which controls the model accepts, resolved by the sync from the provider's own
  // schema. Absent means unresolved, so nothing is claimed rather than guessing a
  // control the model would reject.
  const p = model.metadata?.imageParams;
  const maxReferenceImages = p
    ? p.maxReferenceImages
    : (model.metadata?.maxImageInputs ??
      (endpoint === "image-generation" ? 1 : 0));

  return {
    ...model,
    ...p,
    maxReferenceImages,
    supportsReferences: maxReferenceImages >= 1,
    supportsSize: endpoint === "image-generation",
    supportsGuidance: false,
    // A resolved spec with no enum means the model takes no sampler; only an
    // unresolved one falls back to the shared vocabulary.
    samplers: p ? (p.samplers ?? undefined) : RUNWARE_SCHEDULERS,
    // "Default" lets the checkpoint pick rather than pinning one it may reject.
    defaultParams: {
      width: 1024,
      height: 1024,
      steps: p?.steps?.default ?? 20,
      ...(p?.cfg?.default != null ? { cfg: p.cfg.default } : {}),
      sampler: "Default",
    },
    estimatedSeconds: 15,
    recommendedPromptStyle: "natural-language",
  };
}

export function imageDescriptors(
  pricing: PricingCatalogModel[],
): ImageModelDescriptor[] {
  return pricing
    .map(inferDescriptor)
    .filter((d): d is ImageModelDescriptor => d !== null);
}
