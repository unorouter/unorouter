import { prefetchElysia } from "@/lib/react-query/prefetch";
import { StatusPage } from "@/components/pages/navbar/status/status-page";
import { localeUrl } from "@/i18n/navigation";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "STATUS",
    href: "/status",
    badge: "sponsor",
  });
}

export default async function StatusRoute(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.modelStatusComponents(), () =>
      rpc.api.models["model-status"].components.get(),
    ),
    prefetchElysia(queryClient, queryKeys.pricingVendors(), () =>
      rpc.api.models.pricing.vendors.get(),
    ),
    prefetchElysia(queryClient, queryKeys.perfMetricsSummary(24), () =>
      rpc.api.models["perf-metrics"].summary.get({
        query: { hours: 24 },
      }),
    ),
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
