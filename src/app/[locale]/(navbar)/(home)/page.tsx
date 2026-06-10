import { Home } from "@/components/pages/navbar/home/home";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildSoftwareApplicationSchema } from "@/lib/seo/structured-data";
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

  // Pricing fetched OUTSIDE the query client: dehydrating it serialized the
  // full model catalog (~1MB raw) into the homepage RSC payload. The hero only
  // needs four counts; client widgets (ticker) fetch pricing lazily themselves.
  const [pricing] = await Promise.all([
    handleElysia(await rpc.api.models.pricing.get()),
    queryClient.prefetchQuery({
      queryKey: queryKeys.statsHistory(),
      queryFn: async () => handleElysia(await rpc.api.ops.stats.history.get()),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptionPlans(),
      queryFn: async () =>
        handleElysia(await rpc.api.models.pricing.subscriptions.get()),
    }),
  ]);

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
            modelCount: pricing.modelCount,
            vendorCount: pricing.vendorCount,
            freeCount: pricing.freeCount,
            paidCount: pricing.paidCount,
          }}
        />
      </HydrationBoundary>
    </>
  );
}
