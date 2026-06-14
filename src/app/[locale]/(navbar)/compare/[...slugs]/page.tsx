import { ComparePage } from "@/components/pages/navbar/models/compare/compare-page";
import {
  comboModelList,
  comboTitle,
} from "@/components/pages/navbar/models/compare/compare-text";
import { localeUrl } from "@/i18n/navigation";
import type { ProcessedModel } from "@/lib/api/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
import { handleElysia, modelMatchesSlug, modelSlug } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

// Combos render on-demand; never pre-generated (avoids the crawl trap).
export function generateStaticParams() {
  return [];
}

async function resolveModels(
  slugs: string[] | undefined,
): Promise<ProcessedModel[]> {
  if (!slugs?.length) return [];
  const summary = handleElysia(await rpc.api.models.pricing.get());
  const models = summary.models ?? [];
  return slugs
    .map((slug) => models.find((m) => modelMatchesSlug(m.name, slug)))
    .filter((m): m is ProcessedModel => Boolean(m));
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slugs?: string[] }>;
}) {
  const params = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const models = await resolveModels(params.slugs);

  if (models.length === 0) {
    return getPageMetadata({
      locale,
      href: "/compare",
      title: t("MODELS.COMPARE.META.TITLE", APP_VALUES),
      description: t("MODELS.COMPARE.META.DESCRIPTION"),
      keywords: t("MODELS.COMPARE.META.KEYWORDS"),
      ogImage: ogBadge("sponsor", locale),
    });
  }

  const title = t("MODELS.COMPARE.META.TITLE_COMBO", {
    models: comboTitle(models),
  });
  const description = t("MODELS.COMPARE.META.DESCRIPTION_COMBO", {
    models: comboModelList(models, t("MODELS.COMPARE.FROM")),
  });
  return getPageMetadata({
    locale,
    href: {
      pathname: "/compare/[...slugs]",
      params: { slugs: models.map((m) => modelSlug(m.name)) },
    },
    title,
    description,
    keywords: t("MODELS.COMPARE.META.KEYWORDS"),
    ogImage: ogBadge("sponsor", locale),
  });
}

export default async function Page(props: {
  params: Promise<{ locale: string; slugs?: string[] }>;
}) {
  const params = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const queryClient = getQueryClient();

  const [, , models] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => handleElysia(await rpc.api.models.pricing.get()),
    }),
    Promise.all([
      prefetchElysia(queryClient, queryKeys.rankings("week"), () =>
        rpc.api.models.rankings.get({ query: { period: "week" } }),
      ),
      prefetchElysia(queryClient, queryKeys.perfMetricsSummary(24), () =>
        rpc.api.models["perf-metrics"].summary.get({ query: { hours: 24 } }),
      ),
    ]),
    resolveModels(params.slugs),
  ]);

  const crumbs = [
    { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
    { name: t("MODELS.COMPARE.TITLE"), url: localeUrl(locale, "/compare") },
  ];
  if (models.length > 0) {
    crumbs.push({
      name: comboTitle(models),
      url: localeUrl(locale, {
        pathname: "/compare/[...slugs]",
        params: { slugs: models.map((m) => modelSlug(m.name)) },
      }),
    });
  }

  return (
    <>
      <JsonLd
        id="compare-breadcrumb"
        data={buildBreadcrumbListSchema(crumbs)}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ComparePage />
      </HydrationBoundary>
    </>
  );
}
