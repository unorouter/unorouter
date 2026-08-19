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

  if (!descriptor.supportsCfg) {
    drop("cfg");
    drop("steps");
    drop("clipSkip");
  }
  if (!descriptor.supportsSampler) {
    drop("sampler");
    drop("scheduler");
  }
  if (!descriptor.supportsSeed) drop("seed");
  if (!descriptor.supportsHiresFix) {
    drop("hiresUpscale");
    drop("hiresDenoise");
    drop("hiresSteps");
  }
  // No strength = no init-image inputs; don't forward multi-MB data URIs to a rejector.
  if (!descriptor.supportsStrength) {
    drop("strength");
    drop("initImageUrl");
    drop("maskUrl");
  }
  // ADetailer is a second billed pass; a model that does not declare it must not run one.
  if (!descriptor.supportsAdetailer) drop("adetailer");
  // No Runware schema defines a watermark or guidance field, so neither is ever
  // forwardable. Dropped unconditionally rather than gated on a descriptor flag
  // nothing can set.
  drop("watermark");
  drop("guidance");
  // The provider enum IS the capability: no accepted values means the field is
  // not forwardable at all.
  if (!descriptor.backgroundChoices?.length) drop("background");
  if (!descriptor.supportsSize) {
    drop("width");
    drop("height");
  }
  if (!descriptor.qualityChoices?.length) drop("quality");
  if (!descriptor.outputFormatChoices?.length) drop("outputFormat");

  // Enum knobs also check the model's own choices; an unknown value is still rejected.
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

  return { params: source as ImageParams, dropped };
}

export function filterLorasToCapabilities(
  descriptor: ImageModelDescriptor,
  loras: LoraEntry[] | undefined,
): LoraEntry[] {
  if (!descriptor.supportsLoraChain) return [];
  return loras ?? [];
}

export function capReferences<T>(
  descriptor: ImageModelDescriptor,
  references: T[] | undefined,
): T[] {
  if (!descriptor.supportsReferences) return [];
  return (references ?? []).slice(
    0,
    Math.max(0, descriptor.maxReferenceImages ?? 0),
  );
}
