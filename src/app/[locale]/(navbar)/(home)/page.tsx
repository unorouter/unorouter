import { prefetchElysia } from "@/lib/react-query/prefetch";
import { Home } from "@/components/pages/navbar/home/home";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildSoftwareApplicationSchema } from "@/lib/seo/structured-data";
import type { buildPricingSummary } from "@/lib/api/pricing";
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
    href: "/",
    title: t("HOME.META.TITLE", APP_VALUES),
    description: t("HOME.META.DESCRIPTION"),
    keywords: t("HOME.META.KEYWORDS"),
    ogImage: ogBadge("hero", locale),
  });
}

export default async function HomePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const queryClient = getQueryClient();
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.pricing(), () =>
      rpc.api.models.pricing.get(),
    ),
    prefetchElysia(queryClient, queryKeys.statsHistory(), () =>
      rpc.api.ops.stats.history.get(),
    ),
    prefetchElysia(queryClient, queryKeys.subscriptionPlans(), () =>
      rpc.api.models.pricing.subscriptions.get(),
    ),
  ]);

  const pricing = queryClient.getQueryData<
    ReturnType<typeof buildPricingSummary>
  >(queryKeys.pricing());

  return (
    <>
      <JsonLd
        id="home-software-app"
        data={buildSoftwareApplicationSchema({
          locale,
          description: t("HOME.META.DESCRIPTION"),
          modelCount: pricing?.modelCount,
        })}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Home
          counts={{
            modelCount: pricing?.modelCount ?? 0,
            vendorCount: pricing?.vendorCount ?? 0,
            freeCount: pricing?.freeCount ?? 0,
            paidCount: pricing?.paidCount ?? 0,
          }}
        />
      </HydrationBoundary>
    </>
  );
}
