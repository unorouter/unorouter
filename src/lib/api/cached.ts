import {
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
import {
  dehydrate,
  QueryClient,
  type DehydratedState,
} from "@tanstack/react-query";

// SEO pages (models, compare, rankings, home) read their content through these
// fetchers, which call the upstream services in-process: rpc would loop back
// over http://127.0.0.1, which has no listener during a server render.
export async function getCachedPricing(includeOffline?: boolean) {
  return getPricingSummary(includeOffline);
}

export async function getCachedPricingVendors() {
  return (await getPricingSummary()).vendorNames;
}

export async function getCachedVendorModels(vendorName: string) {
  const summary = await getPricingSummary();
  return {
    models: summary.models
      .filter((m) => m.vendor.name === vendorName)
      .map((m) => leanModel(m)),
  };
}

export async function getCachedFreeChatModels(limit?: number) {
  const summary = await getPricingSummary();
  const free = summary.models
    .filter(isFreeChatModel)
    .map((m) => ({ name: m.name, vendor: m.vendor.name || m.name }));
  return limit == null ? free : free.slice(0, limit);
}

export function getPlansData() {
  return Promise.all([getSubscriptionPlansSummary(), getTopUpInfoSummary()]);
}

export async function getRankingsPageData(period: string) {
  const qc = new QueryClient();
  const data = await fetchRankings(period);
  qc.setQueryData(queryKeys.rankings(period), data);
  return { dehydrated: dehydrate(qc), topModels: data.models.slice(0, 10) };
}

// Models browse: lean pricing (same shape the /pricing endpoint serves) +
// rankings + perf; the detail sheet fetches the full model on open.
export async function getModelsPageData() {
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
  const qc = new QueryClient();
  const perf = await fetchPerfSummary(24).catch(() => null);
  qc.setQueryData(queryKeys.perfMetricsSummary(24), perf);
  return dehydrate(qc);
}

// Compare pages: lean pricing (the comparison table reads only core price +
// capability fields), plus resolved slug models for metadata/breadcrumbs.
export async function getComparePageData(slugs: readonly string[]) {
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

// Lives here, not in utils/server: that module is reachable from client bundles
// and this reads the whole server-side pricing catalog just to name models in
// snippets. Plain data only, so the result stays serializable to the client.
export const getDocsApiKey = async (placeholder = "YOUR_API_KEY") => {
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
