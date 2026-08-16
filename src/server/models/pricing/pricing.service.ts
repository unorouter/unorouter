import { getEffectiveImageModels } from "@/lib/ai/image/models-dynamic";
import {
  buildPricingSummary,
  isChatModel,
  leanModel,
  releaseTs,
  toLeanPricing,
} from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { sleep, unwrap } from "@/lib/utils/base";
import {
  getPricing,
  getPricingModel,
  getSubscriptionPlans,
  getTopUpInfo,
} from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import {
  getPricingSnapshot,
  refreshPricingSnapshot,
} from "@/server/models/pricing/pricing-snapshot";

// The upstream occasionally truncates responses under concurrent renders, and
// a failed parse would otherwise surface as a 500 on a page that only needed
// the model list.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(250 * (i + 1));
    }
  }
  throw lastError;
}

export async function getPricingSummary(includeOffline = false) {
  const res = await withRetry(() =>
    getPricing(includeOffline ? { include_offline: "true" } : undefined, {
      headers: ADMIN_HEADERS,
    }),
  );
  return buildPricingSummary(unwrap(res));
}

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
  let cached = await getPricingSnapshot();
  let model = cached.byName.get(name);
  if (!model) {
    cached = await refreshPricingSnapshot();
    model = cached.byName.get(name);
  }
  return { model: model ?? null };
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
  const res = await withRetry(() =>
    getSubscriptionPlans({
      headers: ADMIN_HEADERS,
    }),
  );
  if (res.status !== 200) return [];
  return processPlans(res.data.data);
}

export async function getTopUpInfoSummary() {
  const res = await withRetry(() =>
    getTopUpInfo({
      headers: ADMIN_HEADERS,
    }),
  );
  return unwrap(res).data;
}
