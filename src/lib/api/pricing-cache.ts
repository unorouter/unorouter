import {
  buildPricingSummary,
  ModelType,
  type ProcessedModel,
} from "@/lib/api/pricing";
import { msg } from "@/lib/config/constants";
import { getPricing } from "@/openapi";

let cache: { models: ProcessedModel[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getModels(): Promise<ProcessedModel[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache.models;
  const res = await getPricing();
  if (!res.data) throw new Error(msg("ERRORS.PRICING_FETCH_FAILED"));
  const summary = buildPricingSummary(res.data);
  cache = { models: summary.models, fetchedAt: Date.now() };
  return cache.models;
}

export async function isMediaModel(model: string) {
  const models = await getModels();
  const found = models.find((m) => m.name === model);

  return {
    buffered: found?.type === "image" || found?.type === "video",
    mediaType: found?.type as ModelType,
  };
}

export async function getCheapestTextModel(): Promise<string> {
  const models = await getModels();
  const textModels = models.filter(
    (m) => m.type === "text" && !m.isFixedPrice && m.inputPrice > 0,
  );
  if (textModels.length === 0) throw new Error(msg("ERRORS.NO_TEXT_MODELS"));
  return textModels.reduce((min, m) =>
    m.inputPrice < min.inputPrice ? m : min,
  ).name;
}
