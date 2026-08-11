import {
  isChatModel,
  isFreeChatModel,
  leanModel,
  toLeanPricing,
} from "@/lib/api/pricing";
import { env } from "@/lib/config/env";
import { queryKeys } from "@/lib/react-query/keys";
import { modelMatchesSlug } from "@/lib/utils/base";
import { fetchPerfSummary } from "@/server/models/perf-metrics/perf-metrics.service";
import {
  getPricingSummary,
  getSubscriptionPlansSummary,
  getTopUpInfoSummary,
} from "@/server/models/pricing/pricing.service";
import { fetchRankings } from "@/server/models/rankings/rankings.service";
import { computeStatsSummary } from "@/server/ops/stats/stats.service";
import {
  dehydrate,
  QueryClient,
  type DehydratedState,
} from "@tanstack/react-query";
import { cacheLife } from "next/cache";

// "use cache" fetchers let SEO pages (models, compare, rankings, home) carry
// their content inside the prerendered shell instead of streaming it from a
// per-request hole; revalidation keeps the data fresh across requests. They
// call the upstream services in-process: rpc would loop back over
// http://127.0.0.1, which has no listener during build prerenders.

// Pricing-carrying caches use "minutes": newly added upstream models should
// show up within ~1min of revalidation, not an hour.
export async function getCachedPricing(includeOffline?: boolean) {
  "use cache";
  cacheLife("minutes");
  return getPricingSummary(includeOffline);
}

// Scoped slices: pages needing only counts/vendor names must not carry the
// ~487kB full pricing into their payload. All derive from the same summary, so
// they cannot drift from the /models table.
export async function getCachedPricingCounts() {
  "use cache";
  cacheLife("minutes");
  const summary = await getPricingSummary();
  return {
    modelCount: summary.modelCount,
    freeCount: summary.freeCount,
    paidCount: summary.paidCount,
    vendorCount: summary.vendorCount,
  };
}

export async function getCachedPricingVendors() {
  "use cache";
  cacheLife("minutes");
  return (await getPricingSummary()).vendorNames;
}

// Must match the /pricing/vendors response shape exactly: the home ticker reads
// this key, so a mismatch silently drops it back to a client fetch.
export async function getDehydratedPricingVendors(): Promise<DehydratedState> {
  "use cache";
  cacheLife("minutes");
  const summary = await getPricingSummary();
  const qc = new QueryClient();
  qc.setQueryData(queryKeys.pricingVendors(), {
    vendorNames: summary.vendorNames,
    modelVendors: summary.models.map((m) => ({
      name: m.name,
      vendor: m.vendor.name,
      chat: isChatModel(m),
    })),
  });
  return dehydrate(qc);
}

export async function getCachedVendorModels(vendorName: string) {
  "use cache";
  cacheLife("minutes");
  const summary = await getPricingSummary();
  return {
    models: summary.models
      .filter((m) => m.vendor.name === vendorName)
      .map((m) => leanModel(m)),
  };
}

export async function getCachedFreeChatModels(limit?: number) {
  "use cache";
  cacheLife("minutes");
  const summary = await getPricingSummary();
  const free = summary.models
    .filter(isFreeChatModel)
    .map((m) => ({ name: m.name, vendor: m.vendor.name || m.name }));
  return limit == null ? free : free.slice(0, limit);
}

// Dehydrated states must be built INSIDE "use cache": seeding stamps
// dataUpdatedAt, which prerenders reject outside a cached scope.
export async function getDehydratedPlans(): Promise<DehydratedState> {
  "use cache";
  cacheLife("hours");
  const qc = new QueryClient();
  const [plans, topUpInfo] = await Promise.all([
    getSubscriptionPlansSummary(),
    getTopUpInfoSummary(),
  ]);
  qc.setQueryData(queryKeys.subscriptionPlans(), plans);
  qc.setQueryData(queryKeys.topUpInfo(), topUpInfo);
  return dehydrate(qc);
}

export async function getDehydratedStatsHistory(): Promise<DehydratedState> {
  "use cache";
  cacheLife("minutes");
  const qc = new QueryClient();
  qc.setQueryData(queryKeys.statsHistory(), await computeStatsSummary());
  return dehydrate(qc);
}

export async function getRankingsPageData(period: string) {
  "use cache";
  cacheLife("hours");
  const qc = new QueryClient();
  const data = await fetchRankings(period);
  qc.setQueryData(queryKeys.rankings(period), data);
  return { dehydrated: dehydrate(qc), topModels: data.models.slice(0, 10) };
}

// Models browse: lean pricing (same shape the /pricing endpoint serves) +
// rankings + perf; the detail sheet fetches the full model on open.
export async function getModelsPageData() {
  "use cache";
  cacheLife("minutes");
  const qc = new QueryClient();
  const [summary, rankings, perf] = await Promise.all([
    getPricingSummary(),
    fetchRankings("week").catch(() => null),
    fetchPerfSummary(24).catch(() => null),
  ]);
  qc.setQueryData(queryKeys.pricing(), toLeanPricing(summary));
  qc.setQueryData(queryKeys.rankings("week"), rankings);
  qc.setQueryData(queryKeys.perfMetricsSummary(24), perf);
  const dehydrated = dehydrate(qc);
  const topModels = summary.models
    .filter((m) => m.type === "text")
    .slice(0, 24)
    .map((m) => ({
      name: m.name,
      vendorName: m.vendor.name,
      description: m.description ?? null,
    }));
  return { dehydrated, topModels, vendorNames: summary.vendorNames };
}

// Dashboard perf strip. A plain prefetchQuery on the request-scoped client is
// dropped by dehydrate(): usePerfMetricsSummaryQuery is staleTime "static", and
// static queries are excluded by default. A fresh client carries no such
// default for the key, so seeding one here is what actually reaches the client
// (the hook is enabled:false and cannot fetch on its own).
export async function getDashboardPerfData(): Promise<DehydratedState> {
  "use cache";
  cacheLife("minutes");
  const qc = new QueryClient();
  const perf = await fetchPerfSummary(24).catch(() => null);
  qc.setQueryData(queryKeys.perfMetricsSummary(24), perf);
  return dehydrate(qc);
}

// Compare pages: lean pricing (the comparison table reads only core price +
// capability fields), plus resolved slug models for metadata/breadcrumbs.
export async function getComparePageData(slugs: readonly string[]) {
  "use cache";
  cacheLife("minutes");
  const qc = new QueryClient();
  // See getModelsPageData on the non-critical rankings/perf catches.
  const [summary, rankings, perf] = await Promise.all([
    getPricingSummary(),
    fetchRankings("week").catch(() => null),
    fetchPerfSummary(24).catch(() => null),
  ]);
  qc.setQueryData(queryKeys.pricing(), toLeanPricing(summary));
  qc.setQueryData(queryKeys.rankings("week"), rankings);
  qc.setQueryData(queryKeys.perfMetricsSummary(24), perf);
  const models = slugs
    .map((slug) => summary.models.find((m) => modelMatchesSlug(m.name, slug)))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  return { dehydrated: dehydrate(qc), models };
}

// A transient upstream /pricing 5xx would otherwise reject the whole server
// render of models/compare (~200 RSC errors/day). Deliberately NOT cached, so a
// momentary failure cannot stick; the client refetches live pricing.
export function emptyPageData() {
  return {
    dehydrated: dehydrate(new QueryClient()),
    topModels: [],
    models: [],
    vendorNames: [],
  };
}

// Lives here, not in utils/server: that module is reachable from client bundles,
// where a "use cache" directive throws "cacheLife is not defined". Cached because
// it reads the whole pricing catalog just to name models in snippets, and an
// uncached read taints every server component awaiting it (the /models/[slug]
// blocking-prerender error). Plain data only - a closure cannot cross the boundary.
export const getDocsApiKey = async (placeholder = "YOUR_API_KEY") => {
  "use cache";
  cacheLife("minutes");
  const data = await getCachedPricing();
  const rawModels = data.models ?? [];
  const models = rawModels.map((m) => ({
    name: m.name,
    vendor: m.vendor.name,
    type: m.type,
    outputPrice: m.isFixedPrice ? m.fixedPrice : m.outputPrice,
  }));

  const modelFor = (vendor: string) =>
    models.find((m) => m.vendor.toLowerCase() === vendor.toLowerCase())?.name ??
    models[0]?.name ??
    "model-name";
  const anthropicModel = modelFor("Anthropic");

  const topTextModel = models
    .filter((m) => m.type === "text" && typeof m.outputPrice === "number")
    .reduce<(typeof models)[number] | null>(
      (best, m) =>
        !best || (m.outputPrice ?? 0) > (best.outputPrice ?? 0) ? m : best,
      null,
    );

  return {
    apiUrl: env.apiUrl,
    placeholder,
    anthropicModel,
    topTextModel: topTextModel?.name ?? models[0]?.name ?? "model-name",
  };
};
