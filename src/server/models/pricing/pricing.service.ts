import { buildPricingSummary } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { unwrap } from "@/lib/utils/base";
import {
  getPricing,
  getPricingCatalog,
  getPricingModel,
  getPricingModelGroups,
  getPricingVendors,
  getSubscriptionPlans,
} from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { cache } from "react";

export const getPricingSummary = cache(async () => {
  const res = await getPricing({ headers: ADMIN_HEADERS });
  return buildPricingSummary(unwrap(res));
});

// Upstream returns this already sorted (free first, then name) and without the
// group maps, so it is ~117KB against the full payload's ~496KB. `full` adds the
// truncated description and the metadata the browse/compare pages filter on.
export const getCatalog = cache(async (full = false) => {
  const res = await getPricingCatalog(full ? { full: "true" } : undefined, {
    headers: ADMIN_HEADERS,
  });
  return unwrap(res);
});

export const getVendors = cache(async () => {
  const res = await getPricingVendors({ headers: ADMIN_HEADERS });
  return unwrap(res);
});

// Upstream filters and sorts (newest first, name as tiebreak) and implies
// `full`, so the vendor page gets its dozen rows instead of all 341.
export const getVendorModels = cache(async (vendorName: string) => {
  const res = await getPricingCatalog(
    { vendor: vendorName },
    { headers: ADMIN_HEADERS },
  );
  return unwrap(res).models;
});

export async function getModelByName(name: string) {
  try {
    const res = await getPricingModel(
      { model: name },
      { headers: ADMIN_HEADERS },
    );
    return buildPricingSummary(res.data).models[0] ?? null;
  } catch {
    return null;
  }
}

// Upstream scopes every field to this model: ~11 group ratios rather than the
// 1800+ the full map carries, and the auto chain already intersected with the
// model's groups rather than the 56KB global list.
export async function getModelGroups(name: string) {
  try {
    const res = await getPricingModelGroups(
      { model: name },
      { headers: ADMIN_HEADERS },
    );
    return unwrap(res);
  } catch {
    return { enable_groups: [], group_ratio: {}, auto_chain: [] };
  }
}

export async function getSubscriptionPlansSummary() {
  const res = await getSubscriptionPlans({ headers: ADMIN_HEADERS });
  if (res.status !== 200) return [];
  return processPlans(res.data.data);
}
