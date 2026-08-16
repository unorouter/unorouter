import { getEffectiveImageModels } from "@/lib/ai/image/models-dynamic";
import {
  buildPricingSummary,
  isChatModel,
  leanModel,
  releaseTs,
  toLeanPricing,
} from "@/lib/api/pricing";
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

export async function getPricingSummary(includeOffline = false) {
  const res = await getPricing(
    includeOffline ? { include_offline: "true" } : undefined,
    { headers: ADMIN_HEADERS },
  );
  return buildPricingSummary(unwrap(res));
}

// Same shape the old module-level snapshot exposed, minus the 5min TTL: React
// cache() dedupes it per render, so the list is fetched once per request that
// needs it instead of being held across requests.
const getPricingSnapshot = cache(async () => {
  const summary = await getPricingSummary();
  return {
    summary,
    models: summary.models,
    byName: new Map(summary.models.map((m) => [m.name, m])),
  };
});

export async function getPricingLean(includeOffline = false) {
  return toLeanPricing(await getPricingSummary(includeOffline));
}

export async function getPricingCounts() {
  const { models } = await getPricingSnapshot();
  const freeCount = models.filter((m) => m.isFree).length;
  const vendorCount = new Set(models.map((m) => m.vendor.name)).size;
  return {
    modelCount: models.length,
    freeCount,
    paidCount: models.length - freeCount,
    vendorCount,
  };
}

export async function getPricingVendors() {
  const { models } = await getPricingSnapshot();
  const vendorNames = [...new Set(models.map((m) => m.vendor.name))].sort(
    (a, b) => a.localeCompare(b),
  );
  const modelVendors = models.map((m) => ({
    name: m.name,
    vendor: m.vendor.name,
    chat: isChatModel(m),
    isFree: !!m.isFree,
    tag: m.tags[0] ?? "Other",
    releaseTs: releaseTs(m),
  }));
  return { vendorNames, modelVendors };
}

export async function getPricingCatalog() {
  const { models, summary } = await getPricingSnapshot();
  // Ratios only for groups some model is actually served by: the gateway knows
  // 1600+ (one routing group per channel), the catalog references ~800.
  const used = new Set(models.flatMap((m) => m.enableGroups));
  const groupRatioMap: Record<string, number> = {};
  for (const [group, ratio] of Object.entries(summary.groupRatioMap)) {
    if (used.has(group)) groupRatioMap[group] = ratio;
  }
  return {
    models: models.map((m) => ({
      name: m.name,
      vendor: m.vendor.name,
      isFree: m.isFree,
      tags: m.tags,
      type: m.type,
      enableGroups: m.enableGroups,
      online: m.online,
      releaseTs: releaseTs(m),
    })),
    groupRatioMap,
    firstFreeModel: summary.firstFreeModel?.name ?? null,
  };
}

export async function getModelBasics() {
  const { models } = await getPricingSnapshot();
  return {
    models: models.map((m) => ({
      name: m.name,
      vendor: m.vendor.name,
      isFree: m.isFree,
      type: m.type,
    })),
  };
}

export async function getTextModels() {
  const { models } = await getPricingSnapshot();
  return {
    models: models
      .filter((m) => m.type === "text")
      .map((m) => ({
        name: m.name,
        isFree: m.isFree,
        vendor: { name: m.vendor.name },
      })),
  };
}

export async function getImageModels() {
  const { models } = await getPricingSnapshot();
  return { models: getEffectiveImageModels(models) };
}

export async function getVendorModels(name: string) {
  const { models } = await getPricingSnapshot();
  return {
    models: models
      .filter((m) => m.vendor.name === name)
      .map((m) => leanModel(m)),
  };
}

export async function getModelDetail(name: string) {
  const { byName } = await getPricingSnapshot();
  return { model: byName.get(name) ?? (await getModelByName(name)) };
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

export async function getTopUpInfoSummary() {
  const res = await getTopUpInfo({ headers: ADMIN_HEADERS });
  return unwrap(res).data;
}
