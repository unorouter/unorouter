import { prefetchElysia } from "@/lib/react-query/prefetch";
import { ModelsPage } from "@/components/pages/navbar/models/models-page";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { localeUrl } from "@/i18n/navigation";
import { handleElysia, modelSlug, vendorSlug } from "@/lib/utils/base";
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
    href: "/models",
    title: t("MODELS.META.TITLE", APP_VALUES),
    description: t("MODELS.META.DESCRIPTION"),
    keywords: t("MODELS.META.KEYWORDS"),
    ogImage: ogBadge("sponsor", locale),
  });
}

export default async function Page(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const queryClient = getQueryClient();

  const [summary] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => handleElysia(await rpc.api.models.pricing.get()),
    }),
    prefetchElysia(queryClient, queryKeys.perfMetricsSummary(24), () =>
      rpc.api.models["perf-metrics"].summary.get({
        query: { hours: 24 },
      }),
    ),
    prefetchElysia(queryClient, queryKeys.rankings("week"), () =>
      rpc.api.models.rankings.get({ query: { period: "week" } }),
    ),
  ]);
  const topModels = summary.models
    .filter((m) => m.type === "text")
    .slice(0, 24);

  return (
    <>
      <JsonLd
        id="models-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.MODELS"), url: localeUrl(locale, "/models") },
        ])}
      />
      <JsonLd
        id="models-collection"
        data={buildCollectionPageSchema({
          name: t("MODELS.META.TITLE", APP_VALUES),
          description: t("MODELS.META.DESCRIPTION"),
          url: localeUrl(locale, "/models"),
          items: topModels
            .filter((m) => vendorSlug(m.vendor.name))
            .map((m) => ({
              name: m.name,
              url: localeUrl(locale, {
                pathname: "/models/[...slug]",
                params: {
                  slug: [vendorSlug(m.vendor.name), modelSlug(m.name)],
                },
              }),
              description: m.description ?? m.vendor.name,
            })),
        })}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ModelsPage />
      </HydrationBoundary>
    </>
  );
}
