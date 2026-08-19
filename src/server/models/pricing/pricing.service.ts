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
