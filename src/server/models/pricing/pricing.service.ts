import { buildPricingSummary } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { unwrap } from "@/lib/utils/base";
import { getPricing, getPricingModel, getSubscriptionPlans } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { cache } from "react";

export const getPricingSummary = cache(async (includeOffline = false) => {
  const res = await getPricing(
    includeOffline ? { include_offline: "true" } : undefined,
    { headers: ADMIN_HEADERS },
  );
  return buildPricingSummary(unwrap(res));
});

export async function getModelByName(name: string) {
  try {
    const res = await getPricingModel(
      { model: name },
      { headers: ADMIN_HEADERS },
    );
    const models = buildPricingSummary(res.data).models;
    return models.find((m) => m.name === name) ?? models[0] ?? null;
  } catch {
    return null;
  }
}

export async function getSubscriptionPlansSummary() {
  const res = await getSubscriptionPlans({ headers: ADMIN_HEADERS });
  if (res.status !== 200) return [];
  return processPlans(res.data.data);
}
