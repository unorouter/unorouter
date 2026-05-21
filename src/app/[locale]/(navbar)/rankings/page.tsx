import { Rankings } from "@/components/pages/navbar/rankings/rankings";
import {
  RANKING_PERIODS,
  type RankingPeriod,
} from "@/lib/api/typebox/rankings";
import { APP_VALUES } from "@/lib/config/constants";
import { localeUrl } from "@/i18n/navigation";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { handleElysia, modelSlug } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

function resolvePeriod(value: string | undefined): RankingPeriod {
  const match = RANKING_PERIODS.find((p) => p === value);
  return match ?? "week";
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/rankings",
    title: t("RANKINGS.META.TITLE", APP_VALUES),
    description: t("RANKINGS.META.DESCRIPTION", APP_VALUES),
    keywords: t("RANKINGS.META.KEYWORDS"),
    ogImage: ogBadge("hero", locale),
  });
}

export default async function RankingsPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const locale = await serverLocale(props);
  const search = await props.searchParams;
  const period = resolvePeriod(search.period);
  const t = await getTranslations({ locale });
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.rankings(period),
    queryFn: async () =>
      handleElysia(await rpc.api.models.rankings.get({ query: { period } })),
  });

  const snapshot = queryClient.getQueryData(queryKeys.rankings(period)) as
    | { models: Array<{ model_name: string; vendor: string }> }
    | undefined;
  const topModels = snapshot?.models?.slice(0, 10) ?? [];

  return (
    <>
      <JsonLd
        id="rankings-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.RANKINGS"), url: localeUrl(locale, "/rankings") },
        ])}
      />
      <JsonLd
        id="rankings-collection"
        data={buildCollectionPageSchema({
          name: t("RANKINGS.META.TITLE", APP_VALUES),
          description: t("RANKINGS.META.DESCRIPTION", APP_VALUES),
          url: localeUrl(locale, "/rankings"),
          items: topModels.map((m) => ({
            name: m.model_name,
            url: localeUrl(locale, {
              pathname: "/models/[slug]",
              params: { slug: modelSlug(m.model_name) },
            }),
            description: m.vendor,
          })),
        })}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Rankings initialPeriod={period} />
      </HydrationBoundary>
    </>
  );
}
