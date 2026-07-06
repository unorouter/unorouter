import type { ProcessedModel } from "@/lib/api/pricing";

// OpenRouter-style output-modality tabs. Only modalities derivable from our data; rerank/speech/transcription need tagging we lack.
export const OUTPUT_MODALITIES = [
  "text",
  "image",
  "audio",
  "video",
  "embeddings",
] as const;
export type OutputModality = (typeof OUTPUT_MODALITIES)[number];

// `:flat` published variants bill flat per-call and ignore request params (size, quality). The
// per-token base name keeps the same model without the suffix.
export const FLAT_VARIANT_SUFFIX = ":flat";
export const isFlatVariant = (model: ProcessedModel): boolean =>
  model.name.endsWith(FLAT_VARIANT_SUFFIX);

export function deriveOutputModality(model: ProcessedModel): OutputModality {
  if (model.type === "embedding") return "embeddings";
  const out = model.metadata.outputModalities ?? [];
  if (model.type === "image" || out.includes("image")) return "image";
  if (model.type === "video" || out.includes("video")) return "video";
  if (model.type === "audio" || out.includes("audio")) return "audio";
  return "text";
}

export function countByOutputModality(
  models: ProcessedModel[],
): Record<OutputModality, number> {
  const counts: Record<OutputModality, number> = {
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

// Per-modality unit for Input/Output columns: fixed-price image gen is per image,
// fixed-price video is per second (the gateway task adaptor multiplies the flat base by the
// clip's seconds), embeddings none, audio/TTS per 1M chars. Per-TOKEN image models (e.g.
// gpt-image-1-mini, gpt-4o-image: quotaType 0) are billed per token, so they use
// the perM unit like text - rendering their per-M rate as "/img" overstates cost
// ~10^6x.
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

// Which flat-fee unit a fixed-price model bills in, for the detail-view header label. Video is
// per-second (the task adaptor scales the base by the clip length), image is per generated image,
// everything else is a flat per-request fee. Per-song/credit/vocal collapse to "request" (the
// upstream unit is not recoverable from the gateway pricing, only the flat number).
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
  // Fixed-price image/video dash the input slot (flat fee lives on output);
  // per-token image bills input tokens, so show perM.
  if (modality === "image" || modality === "video")
    return isFixedPrice ? "dash" : "perM";
  return "perM";
}
