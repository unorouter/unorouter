import {
  buildPricingSummary,
  isChatModel,
  leanModel,
  releaseTs,
  toLeanPricing,
} from "@/lib/api/pricing";
import { getEffectiveImageModels } from "@/lib/ai/image/models-dynamic";
import {
  getPricingSnapshot,
  refreshPricingSnapshot,
} from "@/server/models/pricing/pricing-snapshot";
import { processPlans } from "@/lib/api/subscription";
import { customFetch } from "@/lib/custom-fetch";
import { sleep, unwrap } from "@/lib/utils/base";
import {
  getPricing,
  getSubscriptionPlans,
  getTopUpInfo,
  type PricingData,
} from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

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

// Fetches upstream on every call, unlike getPricingSnapshot's shared 5min
// object. Callers are the fetchers in lib/api/page-data.ts. Direct, because server
// components must not loop back over http://127.0.0.1.
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

// Scoped slices for pages that need only a sliver of pricing. All read the ONE
// shared in-process 5min cache (same snapshot toLeanPricing serves at /pricing),
// so counts/vendors/vendor-models never drift from the /models table. Deriving
// from `.models` keeps membership identical to the online-only feed.

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

// name->vendor pairs: covers NotifyBell's vendorOf lookup, the crawlable
// vendor list, and the token page (vendor icons + the dialog's model pickers).
// No per-model pricing. `chat` rides along because callers that only display
// models (the ticker) must skip embedding/rerank rows, and the predicate needs
// the full model to decide. `isFree`/`tag`/`releaseTs` ride along for the token
// dialog's group-mapping picker, which sorts and badges by them.
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

// The model selector's dropdown: enough to render, group and pin every row, and
// nothing else. Excludes `description` and the metadata blob (~220KB of the full
// list) which only the /models browse filters read.
export async function getPricingCatalog() {
  const { models, summary } = await getPricingSnapshot();
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
    groupRatioMap: summary.groupRatioMap,
    firstFreeModel: summary.firstFreeModel?.name ?? null,
  };
}

// Name -> {isFree, type} for the chat surfaces that only answer "is this model
// free" or "what type is it" for the ACTIVE model.
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

// Text models for the overrides drawer's utility-model picker: it groups by
// vendor and badges free models, so it needs those two fields and nothing else.
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

// The image form's model list, fully derived server-side: descriptors are the
// FINAL shape the form consumes, so the page ships ~50 descriptors instead of
// the whole pricing payload just to run getEffectiveImageModels client-side.
// Same derivation image-submit.service.ts validates against, same snapshot.
export async function getImageModels() {
  const { models } = await getPricingSnapshot();
  return { models: getEffectiveImageModels(models) };
}

// One vendor's models in the SAME lean per-model shape as /pricing (vendor cards
// need release date / modalities / prices), filtered to that vendor.
export async function getVendorModels(name: string) {
  const { models } = await getPricingSnapshot();
  return {
    models: models
      .filter((m) => m.vendor.name === name)
      .map((m) => leanModel(m)),
  };
}

// Single full model for the detail sheet / on-demand consumers; served from
// the 5min in-module pricing cache instead of refetching the whole upstream
// list per drawer open.
export async function getModelDetail(name: string) {
  let cached = await getPricingSnapshot();
  let model = cached.byName.get(name);
  if (!model) {
    cached = await refreshPricingSnapshot();
    model = cached.byName.get(name);
  }
  return { model: model ?? null };
}

// By-name lookup that ALWAYS resolves a known model, even one whose channels are
// all disabled/deleted (absent from the /pricing feed and its offline variant).
// Hits new-api's dedicated /api/pricing/model route (no usable-group filter) and
// runs the single-model response through the same processor. The detail page
// falls back here so a dark model renders instead of 404ing. Null only when the
// name is unknown to new-api's models table too (route 404s -> customFetch throws).
export async function getModelByName(name: string) {
  try {
    const res = await customFetch<{ status: number; data: PricingData }>(
      `/api/pricing/model?model=${encodeURIComponent(name)}`,
      { method: "GET", headers: ADMIN_HEADERS },
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
