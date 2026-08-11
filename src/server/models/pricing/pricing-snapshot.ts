import {
  buildPricingSummary,
  type EndpointInfo,
  type ProcessedModel,
} from "@/lib/api/pricing";
import { msg } from "@/lib/config/constants";
import { getPricing } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

// Pricing crosses THREE cache layers; keep their roles distinct when touching
// any of them: (1) this in-module 5min snapshot for per-request server paths,
// (2) the Next Data Cache 1h on PUBLIC upstream GETs (PUBLIC_CACHE, keyed by
// URL only, so always pair with ADMIN_HEADERS), (3) the Cloudflare edge in
// front of the /pricing BFF responses (purged by CI after deploy).
let cache: {
  models: ProcessedModel[];
  byName: Map<string, ProcessedModel>;
  endpointMap: Record<string, EndpointInfo>;
  fetchedAt: number;
} | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// "Snapshot", not "summary": pricing.service exports a getPricingSummary that
// fetches upstream on EVERY call for the prerender path. This one is the shared
// 5min object with the prebuilt byName map, for hot per-request paths.
export async function getPricingSnapshot() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache;
  return refreshPricingSnapshot();
}

// Same shape but include_offline, for callers that must agree with the sitemap
// and the model page on which URLs exist: a model whose channels are all down
// keeps a real page, so the online-only feed would 404 URLs we advertise. Kept
// as plain module state rather than a "use cache" function because the proxy
// resolves model URLs and cannot call one.
let offlineCache: { models: ProcessedModel[]; fetchedAt: number } | null = null;

export async function getOfflinePricingSnapshot() {
  if (offlineCache && Date.now() - offlineCache.fetchedAt < CACHE_TTL)
    return offlineCache;
  const res = await getPricing(
    { include_offline: "true" },
    { headers: ADMIN_HEADERS },
  );
  if (!res.data) throw new Error(msg("ERRORS.PRICING_FETCH_FAILED"));
  offlineCache = {
    models: buildPricingSummary(res.data).models,
    fetchedAt: Date.now(),
  };
  return offlineCache;
}

// Cache-miss escape hatch (e.g. a just-added model requested by name):
// refetches regardless of TTL, capped to one upstream call per 30s so
// unknown-name requests cannot hammer the upstream.
export async function refreshPricingSnapshot() {
  if (cache && Date.now() - cache.fetchedAt < 30_000) return cache;
  // ADMIN_HEADERS is load-bearing, not boilerplate: upstream GetPricing applies
  // the CALLER's group ratios, and customFetch forwards the caller's cookies
  // when no Authorization is set. Without it, whoever happens to trigger a
  // refill bakes their own pricing into a module-level object every other user
  // then reads for the next 5 minutes.
  const res = await getPricing(undefined, { headers: ADMIN_HEADERS });
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
  const { byName, endpointMap } = await getPricingSnapshot();
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
