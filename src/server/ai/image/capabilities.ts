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
  const source: Record<string, unknown> = { ...(params ?? {}) };
  const dropped: string[] = [];

  const drop = (key: string) => {
    if (source[key] !== undefined) {
      delete source[key];
      dropped.push(key);
    }
  };

  if (!imageParams(descriptor).supportsCfg) {
    drop("cfg");
    drop("steps");
    drop("clipSkip");
  }
  if (!imageParams(descriptor).supportsSampler) {
    drop("sampler");
    drop("scheduler");
  }
  if (!imageParams(descriptor).supportsSeed) drop("seed");
  if (!imageParams(descriptor).supportsHiresFix) {
    drop("hiresUpscale");
    drop("hiresDenoise");
    drop("hiresSteps");
  }
  // No strength = no init-image inputs; don't forward multi-MB data URIs to a rejector.
  if (!imageParams(descriptor).supportsStrength) {
    drop("strength");
    drop("initImageUrl");
    drop("maskUrl");
  }
  // ADetailer is a second billed pass; a model that does not declare it must not run one.
  if (!imageParams(descriptor).supportsAdetailer) drop("adetailer");
  // No Runware schema defines a watermark or guidance field, so neither is ever
  // forwardable. Dropped unconditionally rather than gated on a descriptor flag
  // nothing can set.
  drop("watermark");
  drop("guidance");
  // The provider enum IS the capability: no accepted values means the field is
  // not forwardable at all.
  if (!imageParams(descriptor).backgroundChoices?.length) drop("background");
  if (!imageParams(descriptor).supportsSize) {
    drop("width");
    drop("height");
  }
  if (!imageParams(descriptor).qualityChoices?.length) drop("quality");
  if (!imageParams(descriptor).outputFormatChoices?.length)
    drop("outputFormat");

  // Enum knobs also check the model's own choices; an unknown value is still rejected.
  const quality = imageParams(descriptor).qualityChoices;
  if (quality && typeof source.quality === "string") {
    if (!quality.includes(source.quality)) drop("quality");
  }
  const formats = imageParams(descriptor).outputFormatChoices;
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
  if (!imageParams(descriptor).supportsReferences) return [];
  return (references ?? []).slice(
    0,
    Math.max(0, imageParams(descriptor).maxReferenceImages ?? 0),
  );
}
