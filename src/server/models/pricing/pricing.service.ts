import { unwrap } from "@/lib/utils/base";
import {
  getPricingCatalog,
  getPricingCatalogModel,
  getSubscriptionPlans,
} from "@/openapi";
import { cache } from "react";

// includeOffline keeps models whose every lane is down, flagged online=false.
// Only the sitemap wants them: their pages answer 200 the whole time, so leaving
// them out silently unpublishes thousands of live URLs whenever a provider flaps.
export const getCatalog = cache(async (full = false, includeOffline = false) => {
  const res = await getPricingCatalog({ full, include_offline: includeOffline });
  return unwrap(res);
});

export const getImageModels = cache(async () => {
  const res = await getPricingCatalog({ full: true, type: "image" });
  return unwrap(res).models;
});

export const getModelByName = cache(async (model: string) => {
  try {
    const res = await getPricingCatalogModel({ model });
    return unwrap(res);
  } catch {
    return null;
  }
});

export async function getSubscriptionPlansSummary() {
  return unwrap(await getSubscriptionPlans()).data;
}
