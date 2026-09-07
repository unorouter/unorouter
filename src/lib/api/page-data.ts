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

export async function getComparePageData(slugs: readonly string[]) {
  const seeded = await seedCatalogClient();
  const models = slugs.flatMap((slug) => {
    const found = seeded.browse.models.find((m) =>
      modelMatchesSlug(m.model_name, slug),
    );
    return found ? [found] : [];
  });
  const missing =
    seeded.browse.models.length > 0 && models.length < slugs.length;
  return { dehydrated: dehydrate(seeded.qc), models, missing };
}

// Must NOT be cached, or a momentary upstream 5xx sticks (~200 RSC errors/day).
export function emptyPageData() {
  return {
    dehydrated: dehydrate(new QueryClient()),
    topModels: [],
    models: [],
    missing: false,
    vendorNames: [],
  };
}

export const getDocsApiKey = async (placeholder = "YOUR_API_KEY") => {
  const data = await getCatalog();
  const models = data.models.map((m) => ({
    name: m.model_name,
    vendor: m.vendor,
    type: m.type,
    outputPrice: m.is_fixed_price ? m.fixed_price : m.output_price,
  }));

  const modelFor = (vendor: string) =>
    models.find((m) => m.vendor?.toLowerCase() === vendor.toLowerCase())?.name ??
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
