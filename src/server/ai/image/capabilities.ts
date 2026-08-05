import type { PlaygroundModelDescriptor } from "@/lib/ai/playground/models";
import type { GenerationParams, LoraEntry } from "@/lib/validation/playground";

/**
 * Strips params the resolved model does not support.
 *
 * The `supportsX` flags previously gated only the JSX, so a crafted POST could send `cfg` to a
 * model that has no sampler, or a twelve-entry LoRA chain to a hosted image API, and the submit
 * path forwarded all of it. Enforcing here rather than in the form means the rule holds for any
 * caller, and it runs on the same descriptor the renderer reads so the two cannot drift.
 *
 * Unsupported params are dropped rather than rejected: a remix that carries an SDXL snapshot's
 * clipSkip onto a Flux model should still generate, minus the knob that does not apply.
 */
export function filterParamsToCapabilities(
  descriptor: PlaygroundModelDescriptor,
  params: GenerationParams | undefined,
): { params: GenerationParams; dropped: string[] } {
  const source: Record<string, unknown> = { ...(params ?? {}) };
  const dropped: string[] = [];

  const drop = (key: string) => {
    if (source[key] !== undefined) {
      delete source[key];
      dropped.push(key);
    }
  };

  if (!descriptor.supportsCfg) drop("cfg");
  if (!descriptor.supportsSampler) {
    drop("sampler");
    drop("scheduler");
  }
  // Steps and clip skip are plain numbers every diffusion backend understands, unlike the
  // sampler names, so they ride with CFG rather than with the sampler controls.
  if (!descriptor.supportsCfg) {
    drop("steps");
    drop("clipSkip");
  }
  if (!descriptor.supportsSeed) drop("seed");
  if (!descriptor.supportsHiresFix) {
    drop("hiresUpscale");
    drop("hiresDenoise");
    drop("hiresSteps");
  }
  // An init image and a mask are the img2img/inpaint inputs. A model that cannot take a
  // strength has nothing to do with them, and forwarding a multi-megabyte data URI to a
  // provider that will reject it is worse than dropping it here.
  if (!descriptor.supportsStrength) {
    drop("strength");
    drop("initImageUrl");
    drop("maskUrl");
  }
  // The ADetailer pass inpaints a detected region, so a model that declares no support for
  // it must not have one run (and billed) on its output.
  if (!descriptor.supportsAdetailer) drop("adetailer");
  if (!descriptor.supportsWatermark) drop("watermark");
  if (!descriptor.supportsBackground) drop("background");
  if (!descriptor.supportsSize) {
    drop("width");
    drop("height");
  }
  if (!descriptor.supportsQuality) drop("quality");
  if (!descriptor.supportsOutputFormat) drop("outputFormat");

  // An enum-valued knob must also be checked against the model's own choices, since a
  // supported key with an unknown value is still a request the upstream will reject.
  if (descriptor.qualityChoices && typeof source.quality === "string") {
    if (!descriptor.qualityChoices.includes(source.quality)) drop("quality");
  }
  if (
    descriptor.outputFormatChoices &&
    typeof source.outputFormat === "string"
  ) {
    if (!descriptor.outputFormatChoices.includes(source.outputFormat)) {
      drop("outputFormat");
    }
  }

  return { params: source as GenerationParams, dropped };
}

export function filterLorasToCapabilities(
  descriptor: PlaygroundModelDescriptor,
  loras: LoraEntry[] | undefined,
): LoraEntry[] {
  if (!descriptor.supportsLoraChain) return [];
  return loras ?? [];
}

export function capReferences<T>(
  descriptor: PlaygroundModelDescriptor,
  references: T[] | undefined,
): T[] {
  if (!descriptor.supportsReferences) return [];
  return (references ?? []).slice(
    0,
    Math.max(0, descriptor.maxReferenceImages ?? 0),
  );
}
