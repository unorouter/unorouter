import {
  buildPricingSummary,
  isChatModel,
  leanModel,
  toLeanPricing,
} from "@/lib/api/pricing";
import {
  getPricingSnapshot,
  refreshPricingSnapshot,
} from "@/server/models/pricing/pricing-snapshot";
import { processPlans } from "@/lib/api/subscription";
import { customFetch } from "@/lib/custom-fetch";
import { sleep, unwrap } from "@/lib/utils/base";
import {
  getPricing,
  getSubscriptionPlans,
  getTopUpInfo,
  type PricingData,
} from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

// The upstream occasionally truncates responses under concurrent renders, and
// a failed parse would otherwise surface as a 500 on a page that only needed
// the model list.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(250 * (i + 1));
    }
  }
  throw lastError;
}

// Fetches upstream on every call, unlike getPricingSnapshot's shared 5min
// object. Callers are the fetchers in lib/api/cached.ts. Direct, because server
// components must not loop back over http://127.0.0.1.
export async function getPricingSummary(includeOffline = false) {
  const res = await withRetry(() =>
    getPricing(includeOffline ? { include_offline: "true" } : undefined, {
      headers: ADMIN_HEADERS,
    }),
  );
  return buildPricingSummary(unwrap(res));
}

export async function getPricingLean(includeOffline = false) {
  return toLeanPricing(await getPricingSummary(includeOffline));
}

// Scoped slices for pages that need only a sliver of pricing. All read the ONE
// shared in-process 5min cache (same snapshot toLeanPricing serves at /pricing),
// so counts/vendors/vendor-models never drift from the /models table. Deriving
// from `.models` keeps membership identical to the online-only feed.

export async function getPricingCounts() {
  const { models } = await getPricingSnapshot();
  const freeCount = models.filter((m) => m.isFree).length;
  const vendorCount = new Set(models.map((m) => m.vendor.name)).size;
  return {
    modelCount: models.length,
    freeCount,
    paidCount: models.length - freeCount,
    vendorCount,
  };
}

// name->vendor pairs: covers NotifyBell's vendorOf lookup and the crawlable
// vendor list. Strings only, no per-model pricing/metadata. `chat` rides along
// because callers that only display models (the ticker) must skip
// embedding/rerank rows, and the predicate needs the full model to decide.
export async function getPricingVendors() {
  const { models } = await getPricingSnapshot();
  const vendorNames = [...new Set(models.map((m) => m.vendor.name))].sort(
    (a, b) => a.localeCompare(b),
  );
  const modelVendors = models.map((m) => ({
    name: m.name,
    vendor: m.vendor.name,
    chat: isChatModel(m),
  }));
  return { vendorNames, modelVendors };
}

// One vendor's models in the SAME lean per-model shape as /pricing (vendor cards
// need release date / modalities / prices), filtered to that vendor.
export async function getVendorModels(name: string) {
  const { models } = await getPricingSnapshot();
  return {
    models: models
      .filter((m) => m.vendor.name === name)
      .map((m) => leanModel(m)),
  };
}

// Single full model for the detail sheet / on-demand consumers; served from
// the 5min in-module pricing cache instead of refetching the whole upstream
// list per drawer open.
export async function getModelDetail(name: string) {
  let cached = await getPricingSnapshot();
  let model = cached.byName.get(name);
  if (!model) {
    cached = await refreshPricingSnapshot();
    model = cached.byName.get(name);
  }
  return { model: model ?? null };
}

// By-name lookup that ALWAYS resolves a known model, even one whose channels are
// all disabled/deleted (absent from the /pricing feed and its offline variant).
// Hits new-api's dedicated /api/pricing/model route (no usable-group filter) and
// runs the single-model response through the same processor. The detail page
// falls back here so a dark model renders instead of 404ing. Null only when the
// name is unknown to new-api's models table too (route 404s -> customFetch throws).
export async function getModelByName(name: string) {
  try {
    const res = await customFetch<{ status: number; data: PricingData }>(
      `/api/pricing/model?model=${encodeURIComponent(name)}`,
      { method: "GET", headers: ADMIN_HEADERS },
    );
    const models = buildPricingSummary(res.data).models;
    return models.find((m) => m.name === name) ?? models[0] ?? null;
  } catch {
    return null;
  }
}

export async function getSubscriptionPlansSummary() {
  const res = await withRetry(() =>
    getSubscriptionPlans({
      headers: ADMIN_HEADERS,
    }),
  );
  if (res.status !== 200) return [];
  return processPlans(res.data.data);
}

export async function getTopUpInfoSummary() {
  const res = await withRetry(() =>
    getTopUpInfo({
      headers: ADMIN_HEADERS,
    }),
  );
  return unwrap(res).data;
}
