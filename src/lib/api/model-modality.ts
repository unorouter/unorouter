import { formatPrice } from "@/lib/utils/format/number";
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

// Per-call image/video pricing splits a model into a per-token base and a
// flat-priced `:flat` twin (new-api-sync pricing/image-per-call.ts).
export const isFlatVariant = (model: ProcessedModel): boolean =>
  model.name.endsWith(":flat");

type ConcreteModality = Exclude<OutputModality, "all">;

// `type` is checked first and outputModalities second on purpose: both are
// upstream-supplied and each has been wrong. A model mistyped `text` upstream is
// caught by its modality, and a model whose modality upstream reports as `text`
// (gpt-4o-image) is caught by its type.
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

export function fmtUnit(
  value: number,
  unit: PriceUnit,
  perCall?: boolean,
): string {
  if (unit === "dash" || value <= 0) return "-";
  if (unit === "perImage") return `${formatPrice(value)}/img`;
  if (unit === "perSecond") return `${formatPrice(value)}/s`;
  if (perCall) return `${formatPrice(value)}/call`;
  return formatPrice(value);
}

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

// Fixed-price image/video bill per image/second, so their per-token input price
// is meaningless rather than zero.
export function inputPriceUnit(
  modality: OutputModality,
  isFixedPrice?: boolean,
): PriceUnit {
  return isFixedPrice && (modality === "image" || modality === "video")
    ? "dash"
    : "perM";
}
