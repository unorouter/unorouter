import { buildPricingSummary } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { PUBLIC_CACHE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getPricing, getSubscriptionPlans } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { snapshotModelCatalog } from "./model-catalog.service";

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
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
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
  const summary = buildPricingSummary(unwrap(res));
  if (!includeOffline) snapshotModelCatalog(summary.models);
  return summary;
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
