import { buildPricingSummary, leanModel } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { unwrap } from "@/lib/utils/base";
import {
  getPricing,
  getPricingCatalog,
  getPricingModel,
  getSubscriptionPlans,
} from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { cache } from "react";

export const getPricingSummary = cache(async (includeOffline = false) => {
  const res = await getPricing(
    includeOffline ? { include_offline: "true" } : undefined,
    { headers: ADMIN_HEADERS },
  );
  return buildPricingSummary(unwrap(res));
});

// Upstream returns this already sorted (free first, then name) and without the
// group maps, so it is ~64KB against the full catalog's ~800KB.
export const getCatalog = cache(async () => {
  const res = await getPricingCatalog(undefined, { headers: ADMIN_HEADERS });
  return unwrap(res);
});

export async function getVendorModels(vendorName: string) {
  const { models } = await getPricingSummary();
  return models
    .filter((m) => m.vendor.name === vendorName)
    .map((m) => leanModel(m));
}

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

// Upstream scopes group_ratio to the model's own groups, so this is ~11 entries
// rather than the 800+ the full catalog would carry for every model at once.
export async function getModelGroups(name: string) {
  try {
    const res = await getPricingModel(
      { model: name },
      { headers: ADMIN_HEADERS },
    );
    const model = res.data.data?.[0];
    return {
      enableGroups: model?.enable_groups ?? [],
      groupRatioMap: res.data.group_ratio ?? {},
    };
  } catch {
    return { enableGroups: [], groupRatioMap: {} };
  }
}

export async function getSubscriptionPlansSummary() {
  const res = await getSubscriptionPlans({ headers: ADMIN_HEADERS });
  if (res.status !== 200) return [];
  return processPlans(res.data.data);
}
