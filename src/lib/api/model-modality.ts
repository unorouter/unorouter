import type { ProcessedModel } from "@/lib/api/pricing";

    // OpenRouter-style output-modality tabs. Only modalities we can reliably derive from our data are surfaced (rerank/speech/transcription need endpoint tagging we lack).
export const OUTPUT_MODALITIES = [
  "text",
  "image",
  "audio",
  "video",
  "embeddings",
] as const;
export type OutputModality = (typeof OUTPUT_MODALITIES)[number];

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

export type PriceUnit = "perM" | "perImage" | "perChars" | "dash";

    // Per-modality unit for the Input/Output columns. Mirrors OpenRouter: image gen prices per image on output, embeddings have no output, audio/TTS price per 1M chars.
export function outputPriceUnit(modality: OutputModality): PriceUnit {
  switch (modality) {
    case "image":
      return "perImage";
    case "embeddings":
      return "dash";
    case "audio":
      return "perChars";
    default:
      return "perM";
  }
}

export function inputPriceUnit(modality: OutputModality): PriceUnit {
  return modality === "image" || modality === "video" ? "dash" : "perM";
}
