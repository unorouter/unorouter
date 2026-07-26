import type { ProcessedModel } from "@/lib/api/pricing";

export const OUTPUT_MODALITIES = [
  "all",
  "text",
  "image",
  "audio",
  "video",
  "embeddings",
] as const;
export type OutputModality = (typeof OUTPUT_MODALITIES)[number];

export const AGE_STEPS_DAYS = [0, 7, 30, 90, 365] as const;

export const FLAT_VARIANT_SUFFIX = ":flat";
export const isFlatVariant = (model: ProcessedModel): boolean =>
  model.name.endsWith(FLAT_VARIANT_SUFFIX);

export type ConcreteModality = Exclude<OutputModality, "all">;

export function deriveOutputModality(model: ProcessedModel): ConcreteModality {
  if (model.type === "embedding") return "embeddings";
  const out = model.metadata.outputModalities ?? [];
  if (model.type === "image" || out.includes("image")) return "image";
  if (model.type === "video" || out.includes("video")) return "video";
  if (model.type === "audio" || out.includes("audio")) return "audio";
  return "text";
}

export function matchesModality(
  model: ProcessedModel,
  selected: OutputModality,
): boolean {
  return selected === "all" || deriveOutputModality(model) === selected;
}

export function countByOutputModality(
  models: ProcessedModel[],
): Record<ConcreteModality, number> {
  const counts: Record<ConcreteModality, number> = {
    text: 0,
    image: 0,
    audio: 0,
    video: 0,
    embeddings: 0,
  };
  for (const model of models) counts[deriveOutputModality(model)]++;
  return counts;
}

export type PriceUnit = "perM" | "perImage" | "perSecond" | "perChars" | "dash";

export function outputPriceUnit(
  modality: OutputModality,
  isFixedPrice?: boolean,
): PriceUnit {
  switch (modality) {
    case "image":
      return isFixedPrice ? "perImage" : "perM";
    case "video":
      return isFixedPrice ? "perSecond" : "perM";
    case "embeddings":
      return "dash";
    case "audio":
      return "perChars";
    default:
      return "perM";
  }
}

export function fixedPriceUnitLabel(
  model: ProcessedModel,
): "second" | "image" | "request" {
  const modality = deriveOutputModality(model);
  if (modality === "video") return "second";
  if (modality === "image") return "image";
  return "request";
}

export function inputPriceUnit(
  modality: OutputModality,
  isFixedPrice?: boolean,
): PriceUnit {
  if (modality === "image" || modality === "video")
    return isFixedPrice ? "dash" : "perM";
  return "perM";
}
