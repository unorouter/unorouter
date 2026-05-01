import {
  buildPricingSummary,
  type EndpointInfo,
  type ModelMetadata,
  type ProcessedModel,
} from "@/lib/api/pricing";
import { msg } from "@/lib/config/constants";
import { getPricing } from "@/openapi";

let cache: {
  models: ProcessedModel[];
  endpointMap: Record<string, EndpointInfo>;
  fetchedAt: number;
} | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getSummary() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache;
  const res = await getPricing();
  if (!res.data) throw new Error(msg("ERRORS.PRICING_FETCH_FAILED"));
  const summary = buildPricingSummary(res.data);
  cache = {
    models: summary.models,
    endpointMap: summary.endpointMap,
    fetchedAt: Date.now(),
  };
  return cache;
}

async function getModels(): Promise<ProcessedModel[]> {
  return (await getSummary()).models;
}

export async function isMediaModel(model: string) {
  const { models, endpointMap } = await getSummary();
  const found = models.find((m) => m.name === model);

  // Resolve the endpoint path from the model's supported endpoint types
  let endpointPath: string | undefined;
  if (found) {
    for (const epType of found.endpointTypes) {
      const ep = endpointMap[epType];
      if (ep) {
        endpointPath = ep.path;
        break;
      }
    }
  }

  return {
    buffered: found?.type === "image" || found?.type === "video",
    mediaType: found?.type,
    endpointPath,
  };
}

/** Look up the per-model metadata blob that the sync wrote into the
 *  models.metadata column on new-api. Empty object when the model is
 *  unknown or has no sync-provided hints. */
export async function getModelMetadata(
  model: string,
): Promise<ModelMetadata & { isFree?: boolean }> {
  const { models } = await getSummary();
  const found = models.find((m) => m.name === model);
  if (!found) return {};
  return { ...found.metadata, isFree: found.isFree };
}

export async function getCheapestTextModel(): Promise<string> {
  const models = await getModels();
  const textModels = models.filter(
    (m) =>
      m.type === "text" && !m.isFixedPrice && !m.isFree && m.inputPrice > 0,
  );
  if (textModels.length === 0) throw new Error(msg("ERRORS.NO_TEXT_MODELS"));
  return textModels.reduce((min, m) =>
    m.inputPrice < min.inputPrice ? m : min,
  ).name;
}
