import { isFreeChatModel } from "@/lib/api/pricing";
import { env } from "@/lib/config/env";
import { getRankings, getTopUpInfo } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { modelMatchesSlug, unwrap } from "@/lib/utils/base";
import { fetchPerfSummary } from "@/server/models/perf-metrics/perf-metrics.service";
import {
  getCatalog,
  getPricingSummary,
  getSubscriptionPlansSummary,
} from "@/server/models/pricing/pricing.service";
import {
  dehydrate,
  QueryClient,
  type DehydratedState,
} from "@tanstack/react-query";

// SEO pages (models, compare, rankings, home) read their content through these
// fetchers, which call the upstream services in-process: rpc would loop back
// over http://127.0.0.1, which has no listener during a server render.
export async function getCachedPricingVendors() {
  return (await getPricingSummary()).vendorNames;
}

export async function getCachedFreeChatModels(limit?: number) {
  const summary = await getPricingSummary();
  const free = summary.models
    .filter(isFreeChatModel)
    .map((m) => ({ name: m.name, vendor: m.vendor.name || m.name }));
  return limit == null ? free : free.slice(0, limit);
}

export function getPlansData() {
  return Promise.all([
    getSubscriptionPlansSummary(),
    getTopUpInfo({ headers: ADMIN_HEADERS }).then((res) => unwrap(res).data),
  ]);
}

async function fetchRankings(period: string) {
  const res = await getRankings({ period }, { headers: ADMIN_HEADERS });
  return unwrap(res).data;
}

export async function getRankingsPageData(period: string) {
  const qc = new QueryClient();
  const data = await fetchRankings(period);
  qc.setQueryData(queryKeys.rankings(period), data);
  return { dehydrated: dehydrate(qc), topModels: data.models.slice(0, 10) };
}

// Models browse and compare seed the same keys off one pricing fetch;
// rankings/perf are non-critical, so a failure there leaves the page renderable.
async function seedCatalogClient() {
  const qc = new QueryClient();
  const [summary, browse, rankings, perf] = await Promise.all([
    getPricingSummary(),
    getCatalog(true),
    fetchRankings("week").catch(() => null),
    fetchPerfSummary(24).catch(() => null),
  ]);
  qc.setQueryData(queryKeys.pricingBrowse(), browse);
  qc.setQueryData(queryKeys.rankings("week"), rankings);
  qc.setQueryData(queryKeys.perfMetricsSummary(24), perf);
  return { qc, summary, browse };
}

// Models browse: the detail sheet fetches the full model on open.
export async function getModelsPageData() {
  const seeded = await seedCatalogClient();
  return {
    dehydrated: dehydrate(seeded.qc),
    topModels: seeded.summary.models
      .filter((m) => m.type === "text")
      .slice(0, 24)
      .map((m) => ({
        name: m.name,
        vendorName: m.vendor.name,
        description: m.description ?? null,
      })),
    vendorNames: seeded.summary.vendorNames,
  };
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

// Compare pages: resolved slug models for metadata/breadcrumbs.
export async function getComparePageData(slugs: readonly string[]) {
  const seeded = await seedCatalogClient();
  const models = slugs
    .map((slug) =>
      seeded.browse.models.find((m) => modelMatchesSlug(m.model_name, slug)),
    )
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  const missing =
    seeded.browse.models.length > 0 && models.length < slugs.length;
  return { dehydrated: dehydrate(seeded.qc), models, missing };
}

// A transient upstream /pricing 5xx would otherwise reject the whole server
// render of models/compare (~200 RSC errors/day). Deliberately NOT cached, so a
// momentary failure cannot stick; the client refetches live pricing.
export function emptyPageData() {
  return {
    dehydrated: dehydrate(new QueryClient()),
    topModels: [],
    models: [],
    missing: false,
    vendorNames: [],
  };
}

// Lives here, not in utils/server: that module is reachable from client bundles
// and this reads the whole server-side pricing catalog just to name models in
// snippets. Plain data only, so the result stays serializable to the client.
export const getDocsApiKey = async (placeholder = "YOUR_API_KEY") => {
  const data = await getPricingSummary();
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
