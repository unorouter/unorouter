import { imageParams } from "@/lib/ai/image/models";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageParams, LoraEntry } from "@/lib/validation/image";

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
  if (!caps.supportsStrength) {
    drop("strength");
    drop("initImageUrl");
    drop("maskUrl");
  }
  if (!caps.supportsAdetailer) drop("adetailer");
  drop("watermark");
  drop("guidance");
  if (!caps.backgroundChoices?.length) drop("background");
  if (!caps.supportsSize) {
    drop("width");
    drop("height");
  }
  if (!caps.qualityChoices?.length) drop("quality");
  if (!caps.outputFormatChoices?.length) drop("outputFormat");

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

  return { params: source, dropped };
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
