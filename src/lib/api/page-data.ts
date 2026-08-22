import { env } from "@/lib/config/env";
import { getRankings, getTopUpInfo } from "@/openapi";
import { queryKeys } from "@/lib/react-query/keys";
import { modelMatchesSlug, unwrap } from "@/lib/utils/base";
import { fetchPerfSummary } from "@/server/models/perf-metrics/perf-metrics.service";
import {
  getCatalog,
  getSubscriptionPlansSummary,
} from "@/server/models/pricing/pricing.service";
import { dehydrate, QueryClient } from "@tanstack/react-query";

export async function getCachedFreeChatModels(limit?: number) {
  const catalog = await getCatalog();
  const free = catalog.models
    .filter((m) => m.is_free && m.chat)
    .sort((a, b) => {
      const diff = b.release_ts - a.release_ts;
      return diff !== 0 ? diff : a.model_name.localeCompare(b.model_name);
    })
    .map((m) => ({ name: m.model_name, vendor: m.vendor || m.model_name }));
  return limit == null ? free : free.slice(0, limit);
}

export function getPlansData() {
  return Promise.all([
    getSubscriptionPlansSummary(),
    getTopUpInfo().then((res) => unwrap(res).data),
  ]);
}

async function fetchRankings(period: string) {
  const res = await getRankings({ period });
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
  const [browse, rankings, perf] = await Promise.all([
    getCatalog(true),
    fetchRankings("week").catch(() => null),
    fetchPerfSummary(24).catch(() => null),
  ]);
  qc.setQueryData(queryKeys.pricingBrowse(), browse);
  qc.setQueryData(queryKeys.rankings("week"), rankings);
  qc.setQueryData(queryKeys.perfMetricsSummary(24), perf);
  return { qc, browse };
}

// Models browse: the detail sheet fetches the full model on open.
export async function getModelsPageData() {
  const seeded = await seedCatalogClient();
  return {
    dehydrated: dehydrate(seeded.qc),
    topModels: seeded.browse.models
      .filter((m) => m.type === "text")
      .slice(0, 24)
      .map((m) => ({
        name: m.model_name,
        vendorName: m.vendor,
        description: m.description ?? null,
      })),
    vendorNames: [...new Set(seeded.browse.models.map((m) => m.vendor))].sort(
      (a, b) => a.localeCompare(b),
    ),
  };
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
  const data = await getCatalog();
  const models = data.models.map((m) => ({
    name: m.model_name,
    vendor: m.vendor,
    type: m.type,
    outputPrice: m.is_fixed_price ? m.fixed_price : m.output_price,
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
