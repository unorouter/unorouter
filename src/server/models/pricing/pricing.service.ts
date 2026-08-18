import { processPlans } from "@/lib/api/subscription";
import { unwrap } from "@/lib/utils/base";
import {
  getPricingCatalog,
  getPricingCatalogModel,
  getPricingModelGroups,
  getSubscriptionPlans,
} from "@/openapi";
import { cache } from "react";

// Upstream returns this already sorted (free first, then name) and without the
// group maps, so it is ~117KB against the full payload's ~496KB. `full` adds the
// truncated description and the metadata the browse/compare pages filter on.
export const getCatalog = cache(async (full = false) => {
  const res = await getPricingCatalog({ full });
  return unwrap(res);
});

// Reachable by name even when every channel is offline, unlike the list, so a
// detail page still renders for a model nothing can currently route.
export const getModelByName = cache(async (model: string) => {
  try {
    const res = await getPricingCatalogModel({ model });
    return unwrap(res);
  } catch {
    return null;
  }
});

// Upstream scopes every field to this model: ~11 group ratios rather than the
// 1800+ the full map carries, and the auto chain already intersected with the
// model's groups rather than the 56KB global list.
export async function getModelGroups(name: string) {
  return unwrap(await getPricingModelGroups({ model: name }));
}

export async function getSubscriptionPlansSummary() {
  const res = await getSubscriptionPlans();
  return processPlans(unwrap(res).data);
}
