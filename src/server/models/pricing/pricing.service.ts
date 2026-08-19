import {
  ENDPOINT_PRECEDENCE,
  getEffectiveImageModels,
} from "@/lib/ai/image/models-dynamic";
import { unwrap } from "@/lib/utils/base";
import {
  getPricingCatalog,
  getPricingCatalogModel,
  getSubscriptionPlans,
} from "@/openapi";
import { cache } from "react";

export const getCatalog = cache(async (full = false) => {
  const res = await getPricingCatalog({ full });
  return unwrap(res);
});

// aihorde rows are listable but not submittable by the image UI, so upstream
// scopes the list to endpoints it can actually reach.
export const getImageModels = cache(async () => {
  const res = await getPricingCatalog({
    full: true,
    type: "image",
    endpoint: ENDPOINT_PRECEDENCE.join(","),
  });
  return getEffectiveImageModels(unwrap(res).models);
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
