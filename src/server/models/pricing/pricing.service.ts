import { buildPricingSummary, toLeanPricing } from "@/lib/api/pricing";
import {
  getPricingSummary as getCachedByName,
  refreshPricingSummary,
} from "@/lib/api/pricing-cache";
import { processPlans } from "@/lib/api/subscription";
import { PUBLIC_CACHE } from "@/lib/config/constants";
import { customFetch } from "@/lib/custom-fetch";
import { sleep, unwrap } from "@/lib/utils/base";
import {
  getPricing,
  getSubscriptionPlans,
  getTopUpInfo,
  type PricingData,
} from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

// Build prerenders fan out across ~31 workers and the upstream occasionally
// truncates responses under that concurrency; a failed parse is not cached,
// so without retries every remaining page re-attempts and the build dies.
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

// In-process pricing summary: server components and build-time prerenders
// must not loop back over http://127.0.0.1 (no self server during build).
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

// Single full model for the detail sheet / on-demand consumers; served from
// the 5min in-module pricing cache instead of refetching the whole upstream
// list per drawer open.
export async function getModelDetail(name: string) {
  let cached = await getCachedByName();
  let model = cached.byName.get(name);
  if (!model) {
    cached = await refreshPricingSummary();
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
      ...PUBLIC_CACHE,
    }),
  );
  if (res.status !== 200) return [];
  return processPlans(res.data.data);
}

export async function getTopUpInfoSummary() {
  const res = await withRetry(() =>
    getTopUpInfo({
      headers: ADMIN_HEADERS,
      ...PUBLIC_CACHE,
    }),
  );
  return unwrap(res).data;
}
