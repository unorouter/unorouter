import { buildPricingSummary } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { unwrap } from "@/lib/utils/base";
import {
  getPricing,
  getPricingModel,
  getSubscriptionPlans,
  getTopUpInfo,
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

// Shared by the /pricing slice routes: one upstream fetch per render, plus the
// byName map they'd otherwise each rebuild.
export const getPricingCatalogSource = cache(async () => {
  const summary = await getPricingSummary();
  return {
    summary,
    models: summary.models,
    byName: new Map(summary.models.map((m) => [m.name, m])),
  };
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

export async function isMediaModel(model: string) {
  const found = await getModelByName(model);
  const endpointMap = found
    ? (await getPricingSummary()).endpointMap
    : undefined;
  let endpointPath: string | undefined;
  for (const epType of found?.endpointTypes ?? []) {
    const ep = endpointMap?.[epType];
    if (ep) {
      endpointPath = ep.path;
      break;
    }
  }
  return {
    buffered: found?.type === "image" || found?.type === "video",
    mediaType: found?.type,
    endpointPath,
  };
}

export async function getSubscriptionPlansSummary() {
  const res = await getSubscriptionPlans({ headers: ADMIN_HEADERS });
  if (res.status !== 200) return [];
  return processPlans(res.data.data);
}

export async function getTopUpInfoSummary() {
  const res = await getTopUpInfo({ headers: ADMIN_HEADERS });
  return unwrap(res).data;
}
