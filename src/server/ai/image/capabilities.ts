import { imageParams } from "@/lib/ai/image/models";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageParams, LoraEntry } from "@/lib/validation/image";

/**
 * Strips params the resolved model does not support, server-side, so the rule holds for
 * any caller (not just the form) and runs on the same descriptor the renderer reads.
 * Unsupported params drop rather than reject: a remix carrying an SDXL knob onto a Flux
 * model still generates, minus the knob.
 */
export function filterParamsToCapabilities(
  descriptor: ImageModelDescriptor,
  params: ImageParams | undefined,
): { params: ImageParams; dropped: string[] } {
  const caps = imageParams(descriptor);
  const source: Record<string, unknown> = { ...(params ?? {}) };
  const dropped: string[] = [];

  const drop = (key: string) => {
    if (source[key] !== undefined) {
      delete source[key];
      dropped.push(key);
    }
  };

  if (!caps.supportsCfg) {
    drop("cfg");
    drop("steps");
    drop("clipSkip");
  }
  if (!caps.supportsSampler) {
    drop("sampler");
    drop("scheduler");
  }
  if (!caps.supportsSeed) drop("seed");
  if (!caps.supportsHiresFix) {
    drop("hiresUpscale");
    drop("hiresDenoise");
    drop("hiresSteps");
  }
  // No strength = no init-image inputs; don't forward multi-MB data URIs to a rejector.
  if (!caps.supportsStrength) {
    drop("strength");
    drop("initImageUrl");
    drop("maskUrl");
  }
  // ADetailer is a second billed pass; a model that does not declare it must not run one.
  if (!caps.supportsAdetailer) drop("adetailer");
  // No Runware schema defines a watermark or guidance field, so neither is ever
  // forwardable. Dropped unconditionally rather than gated on a descriptor flag
  // nothing can set.
  drop("watermark");
  drop("guidance");
  // The provider enum IS the capability: no accepted values means the field is
  // not forwardable at all.
  if (!caps.backgroundChoices?.length) drop("background");
  if (!caps.supportsSize) {
    drop("width");
    drop("height");
  }
  if (!caps.qualityChoices?.length) drop("quality");
  if (!caps.outputFormatChoices?.length) drop("outputFormat");

  // Enum knobs also check the model's own choices; an unknown value is still rejected.
  const quality = caps.qualityChoices;
  if (quality && typeof source.quality === "string") {
    if (!quality.includes(source.quality)) drop("quality");
  }
  const formats = caps.outputFormatChoices;
  if (formats && typeof source.outputFormat === "string") {
    if (!formats.includes(source.outputFormat)) {
      drop("outputFormat");
    }
  }

  return { params: source as ImageParams, dropped };
}

export function filterLorasToCapabilities(
  descriptor: ImageModelDescriptor,
  loras: LoraEntry[] | undefined,
): LoraEntry[] {
  if (!imageParams(descriptor).supportsLoraChain) return [];
  return loras ?? [];
}

export function capReferences<T>(
  descriptor: ImageModelDescriptor,
  references: T[] | undefined,
): T[] {
  const caps = imageParams(descriptor);
  if (!caps.supportsReferences) return [];
  return (references ?? []).slice(0, Math.max(0, caps.maxReferenceImages ?? 0));
}
