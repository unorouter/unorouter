import { slimPricingForHydration } from "@/lib/api/pricing";
import { queryKeys } from "@/lib/react-query/keys";
import { modelMatchesSlug } from "@/lib/utils/base";
import { fetchPerfSummary } from "@/server/models/perf-metrics/perf-metrics.service";
import {
  getPricingSummary,
  getSubscriptionPlansSummary,
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

export async function getCachedPricing(includeOffline?: boolean) {
  "use cache";
  cacheLife("hours");
  return getPricingSummary(includeOffline);
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

// Dehydrated React Query states are built INSIDE "use cache": prefetchQuery
// stamps Date.now() internally, which prerenders reject outside cached scope.

async function seed(
  qc: QueryClient,
  queryKey: readonly unknown[],
  data: unknown,
) {
  await qc.prefetchQuery({
    queryKey: queryKey as unknown[],
    queryFn: () => Promise.resolve(data),
  });
}

export async function getDehydratedPlans(): Promise<DehydratedState> {
  "use cache";
  cacheLife("hours");
  const qc = new QueryClient();
  await seed(qc, queryKeys.subscriptionPlans(), await getSubscriptionPlansSummary());
  return dehydrate(qc);
}

export async function getDehydratedStatsHistory(): Promise<DehydratedState> {
  "use cache";
  cacheLife("minutes");
  const qc = new QueryClient();
  await seed(qc, queryKeys.statsHistory(), await computeStatsSummary());
  return dehydrate(qc);
}

export async function getRankingsPageData(period: string) {
  "use cache";
  cacheLife("hours");
  const qc = new QueryClient();
  const data = await fetchRankings(period);
  await seed(qc, queryKeys.rankings(period), data);
  return { dehydrated: dehydrate(qc), topModels: data.models.slice(0, 10) };
}

// Models browse: slimmed pricing (descriptions/group pricing stripped, same
// as the old serializeData pass) + rankings + perf, plus the summary itself
// for the page's JsonLd.
export async function getModelsPageData() {
  "use cache";
  cacheLife("hours");
  const qc = new QueryClient();
  const [summary, rankings, perf] = await Promise.all([
    getPricingSummary(),
    fetchRankings("week"),
    fetchPerfSummary(24),
  ]);
  await Promise.all([
    seed(qc, queryKeys.pricing(), summary),
    seed(qc, queryKeys.rankings("week"), rankings),
    seed(qc, queryKeys.perfMetricsSummary(24), perf),
  ]);
  const dehydrated = dehydrate(qc, {
    serializeData: slimPricingForHydration,
  });
  const topModels = summary.models
    .filter((m) => m.type === "text")
    .slice(0, 24)
    .map((m) => ({
      name: m.name,
      vendorName: m.vendor.name,
      description: m.description ?? null,
    }));
  return { dehydrated, topModels };
}

// Compare pages: full pricing joins the hydration state (the sheet-style
// compare UI reads complete model objects), plus resolved slug models for
// metadata/breadcrumbs.
export async function getComparePageData(slugs: readonly string[]) {
  "use cache";
  cacheLife("hours");
  const qc = new QueryClient();
  const [summary, rankings, perf] = await Promise.all([
    getPricingSummary(),
    fetchRankings("week"),
    fetchPerfSummary(24),
  ]);
  await Promise.all([
    seed(qc, queryKeys.pricing(), summary),
    seed(qc, queryKeys.rankings("week"), rankings),
    seed(qc, queryKeys.perfMetricsSummary(24), perf),
  ]);
  const models = slugs
    .map((slug) => summary.models.find((m) => modelMatchesSlug(m.name, slug)))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  return { dehydrated: dehydrate(qc), models };
}

// Shuffle runs inside the cached scope: Math.random is non-deterministic and
// rejected in prerenders outside "use cache". Order is fixed per cache entry.
export async function getCachedFreeTextModels(limit?: number) {
  "use cache";
  cacheLife("hours");
  const summary = await getPricingSummary();
  const free = summary.models
    .filter((m) => m.type === "text" && m.isFree)
    .map((m) => m.name);
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i]!, free[j]!] = [free[j]!, free[i]!];
  }
  return limit == null ? free : free.slice(0, limit);
}
