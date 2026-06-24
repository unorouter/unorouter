import {
  buildPricingSummary,
  type EndpointInfo,
  type ProcessedModel,
} from "@/lib/api/pricing";
import { msg } from "@/lib/config/constants";
import { getPricing } from "@/openapi";

let cache: {
  models: ProcessedModel[];
  // O(1) per-request lookup; every stream + media dispatch hits this.
  byName: Map<string, ProcessedModel>;
  endpointMap: Record<string, EndpointInfo>;
  fetchedAt: number;
} | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function getPricingSummary() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache;
  const res = await getPricing();
  if (!res.data) throw new Error(msg("ERRORS.PRICING_FETCH_FAILED"));
  const summary = buildPricingSummary(res.data);
  cache = {
    models: summary.models,
    byName: new Map(summary.models.map((m) => [m.name, m])),
    endpointMap: summary.endpointMap,
    fetchedAt: Date.now(),
  };
  return cache;
}

export async function isMediaModel(model: string) {
  const { byName, endpointMap } = await getPricingSummary();
  const found = byName.get(model);

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

export async function getFreeTextModels(limit?: number): Promise<string[]> {
  const { models } = await getPricingSummary();
  const free = models
    .filter((m) => m.type === "text" && m.isFree)
    .map((m) => m.name);
  // Fisher-Yates: an unbiased shuffle so the race samples free models uniformly (sort-by-random is skewed).
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return limit == null ? free : free.slice(0, limit);
}
