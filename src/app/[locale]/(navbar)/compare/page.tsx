import { ComparePage } from "@/components/pages/navbar/models/compare/compare-page";
import { APP_VALUES } from "@/lib/config/constants";
import { localeUrl } from "@/i18n/navigation";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
import { handleElysia } from "@/lib/utils/base";
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
    href: "/compare",
    title: t("MODELS.COMPARE.META.TITLE", APP_VALUES),
    description: t("MODELS.COMPARE.META.DESCRIPTION"),
    keywords: t("MODELS.COMPARE.META.KEYWORDS"),
    ogImage: ogBadge("sponsor", locale),
  });
}

export default async function Page(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.fetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => handleElysia(await rpc.api.models.pricing.get()),
    }),
    prefetchElysia(queryClient, queryKeys.rankings("week"), () =>
      rpc.api.models.rankings.get({ query: { period: "week" } }),
    ),
  ]);

  return (
    <>
      <JsonLd
        id="compare-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          {
            name: t("MODELS.COMPARE.TITLE"),
            url: localeUrl(locale, "/compare"),
          },
        ])}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ComparePage />
      </HydrationBoundary>
    </>
  );
}
