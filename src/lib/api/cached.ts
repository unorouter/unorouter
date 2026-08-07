import { isFreeChatModel, leanOne, toLeanPricing } from "@/lib/api/pricing";
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
      .map((m) => leanOne(m)),
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

export async function getCachedRankings(period: string) {
  "use cache";
  cacheLife("hours");
  return fetchRankings(period);
}

export async function getCachedPerfSummary(hours: number) {
  "use cache";
  cacheLife("hours");
  return fetchPerfSummary(hours);
}

export async function getCachedSubscriptionPlans() {
  "use cache";
  cacheLife("hours");
  return getSubscriptionPlansSummary();
}

export async function getCachedStatsHistory() {
  "use cache";
  cacheLife("minutes");
  return computeStatsSummary();
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
