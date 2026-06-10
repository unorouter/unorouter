import { StatusPage } from "@/components/pages/navbar/status/status-page";
import { localeUrl } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
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
    href: "/status",
    title: t("STATUS.META.TITLE", APP_VALUES),
    description: t("STATUS.META.DESCRIPTION", APP_VALUES),
    keywords: t("STATUS.META.KEYWORDS"),
    ogImage: ogBadge("sponsor", locale),
  });
}

export default async function StatusRoute(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const queryClient = getQueryClient();

  // modelStatusPage NOT prefetched: dehydrating it inlines ~16MB into the SSR
  // HTML and dominates TTFB; the client fetches after hydration.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.modelStatusComponents(),
      queryFn: async () =>
        handleElysia(await rpc.api.models["model-status"].components.get()),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => handleElysia(await rpc.api.models.pricing.get()),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.perfMetricsSummary(24),
      queryFn: async () =>
        handleElysia(
          await rpc.api.models["perf-metrics"].summary.get({
            query: { hours: 24 },
          }),
        ),
    }),
  ]);

  return (
    <>
      <JsonLd
        id="status-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.STATUS"), url: localeUrl(locale, "/status") },
        ])}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <StatusPage />
      </HydrationBoundary>
    </>
  );
}
