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

export async function getModelMetadata(
  model: string,
): Promise<ModelMetadata & { isFree?: boolean }> {
  const { models } = await getSummary();
  const found = models.find((m) => m.name === model);
  if (!found) return {};
  return { ...found.metadata, isFree: found.isFree };
}

// 0 = unknown or ratio-priced (caller: "skip pre-charge", not "free").
export async function getModelFixedPrice(model: string): Promise<number> {
  const { models } = await getSummary();
  const found = models.find((m) => m.name === model);
  if (!found || !found.isFixedPrice) return 0;
  return found.fixedPrice ?? 0;
}

export async function getModelEndpointTypes(
  model: string,
): Promise<string[] | null> {
  const { models } = await getSummary();
  const found = models.find((m) => m.name === model);
  if (!found) return null;
  return found.endpointTypes ?? [];
}

export async function getFreeTextModels(limit = 5): Promise<string[]> {
  const models = await getModels();
  return models
    .filter((m) => m.type === "text" && m.isFree)
    .sort(() => Math.random() - 0.5)
    .slice(0, limit)
    .map((m) => m.name);
}
