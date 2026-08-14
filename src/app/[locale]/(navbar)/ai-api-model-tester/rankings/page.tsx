import { prefetchElysia } from "@/lib/react-query/prefetch";
import { RankingsTable } from "@/components/pages/navbar/model-tester/rankings-table";
import { APP_VALUES } from "@/lib/config/constants";
import { localeUrl } from "@/i18n/navigation";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/ai-api-model-tester/rankings",
    title: t("MODEL_TESTER.RANKINGS.META_TITLE", APP_VALUES),
    description: t("MODEL_TESTER.RANKINGS.META_DESCRIPTION", APP_VALUES),
    keywords: t("MODEL_TESTER.META.KEYWORDS"),
    ogImage: ogBadge("tester", locale),
  });
}

async function RankingsData() {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.modelTesterStats(), () =>
      rpc.api.models["model-tester"].stats.get(),
    ),
    prefetchElysia(queryClient, queryKeys.modelTesterRankings(1, 20), () =>
      rpc.api.models["model-tester"].rankings.get({
        query: { page: 1, pageSize: 20 },
      }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RankingsTable />
    </HydrationBoundary>
  );
}

export default async function ModelTesterRankingsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });

  return (
    <>
      <JsonLd
        id="model-tester-rankings-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          {
            name: t("NAV.MODEL_TESTER"),
            url: localeUrl(locale, "/ai-api-model-tester"),
          },
          {
            name: t("MODEL_TESTER.TABS.RANKINGS"),
            url: localeUrl(locale, "/ai-api-model-tester/rankings"),
          },
        ])}
      />
      <RankingsData />
    </>
  );
}
