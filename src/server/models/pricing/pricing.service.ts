import { buildPricingSummary } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { PUBLIC_CACHE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getPricing, getSubscriptionPlans } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { snapshotModelCatalog } from "./model-catalog.service";

// In-process pricing summary: server components and build-time prerenders
// must not loop back over http://127.0.0.1 (no self server during build).
export async function getPricingSummary(includeOffline = false) {
  const res = await getPricing(
    includeOffline ? { include_offline: "true" } : undefined,
    { headers: ADMIN_HEADERS },
  );
  const summary = buildPricingSummary(unwrap(res));
  if (!includeOffline) snapshotModelCatalog(summary.models);
  return summary;
}

export async function getSubscriptionPlansSummary() {
  const res = await getSubscriptionPlans({
    headers: ADMIN_HEADERS,
    ...PUBLIC_CACHE,
  });
  if (res.status !== 200) return [];
  return processPlans(res.data.data);
}
