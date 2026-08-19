import { formatPrice } from "@/lib/utils/format/number";
import type { ModelMetadata } from "@/lib/api/pricing";

// These helpers read a handful of fields, so they are typed by what they touch
// rather than by one concrete row shape: the browse list and the full detail
// record both satisfy them.
type ModalityModel = { type: string; metadata?: ModelMetadata };

// The picker list carries no metadata; a detail surface handed one of those rows
// renders empty fields rather than crashing on a missing object.
export const EMPTY_METADATA = {} as ModelMetadata;
type PricedModel = ModalityModel &
  (
    | {
        is_fixed_price: boolean;
        input_price: number;
        output_price: number;
        fixed_price: number;
        original_input_price?: number | null;
        original_output_price?: number | null;
        original_fixed_price?: number | null;
      }
    | {
        isFixedPrice: boolean;
        inputPrice: number;
        outputPrice: number;
        fixedPrice: number;
        originalInputPrice: number | null;
        originalOutputPrice: number | null;
        originalFixedPrice: number | null;
      }
  );

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
export const isFlatVariant = (model: { model_name: string }): boolean =>
  model.model_name.endsWith(":flat");

type ConcreteModality = Exclude<OutputModality, "all">;

// `type` is checked first and outputModalities second on purpose: both are
// upstream-supplied and each has been wrong. A model mistyped `text` upstream is
// caught by its modality, and a model whose modality upstream reports as `text`
// (gpt-4o-image) is caught by its type.
export function deriveOutputModality(model: ModalityModel): ConcreteModality {
  if (model.type === "embedding") return "embeddings";
  const out = model.metadata?.outputModalities ?? [];
  if (model.type === "image" || out.includes("image")) return "image";
  if (model.type === "video" || out.includes("video")) return "video";
  if (model.type === "audio" || out.includes("audio")) return "audio";
  return "text";
}

export function matchesModality(
  model: ModalityModel,
  selected: OutputModality,
): boolean {
  return selected === "all" || deriveOutputModality(model) === selected;
}

export function countByOutputModality(
  models: ModalityModel[],
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

// A fixed-price model carries ONE price, and which column it belongs in depends
// on the modality: image/video bill per output artifact, everything else per
// input. The unused side is 0 (or null for the pre-discount original) so callers
// can render both columns uniformly.
export function modelPriceColumns(model: PricedModel) {
  const modality = deriveOutputModality(model);
  const onOutput = modality === "image" || modality === "video";
  const p =
    "is_fixed_price" in model
      ? {
          fixed: model.is_fixed_price,
          input: model.input_price,
          output: model.output_price,
          flat: model.fixed_price,
          origInput: model.original_input_price ?? null,
          origOutput: model.original_output_price ?? null,
          origFlat: model.original_fixed_price ?? null,
        }
      : {
          fixed: model.isFixedPrice,
          input: model.inputPrice,
          output: model.outputPrice,
          flat: model.fixedPrice,
          origInput: model.originalInputPrice,
          origOutput: model.originalOutputPrice,
          origFlat: model.originalFixedPrice,
        };
  if (!p.fixed)
    return {
      input: p.input,
      output: p.output,
      originalInput: p.origInput,
      originalOutput: p.origOutput,
    };
  return {
    input: onOutput ? 0 : p.flat,
    output: onOutput ? p.flat : 0,
    originalInput: onOutput ? null : p.origFlat,
    originalOutput: onOutput ? p.origFlat : null,
  };
}

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
  model: ModalityModel,
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
