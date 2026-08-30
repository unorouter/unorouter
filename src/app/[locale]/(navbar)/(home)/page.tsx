import { Home } from "@/components/pages/navbar/home/home";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { buildSoftwareApplicationSchema } from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "HOME",
    href: "/",
    badge: "hero",
  });
}

export default async function HomePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });

  const queryClient = getQueryClient();
  const [counts] = await Promise.all([
    prefetchElysia(queryClient, queryKeys.pricingCounts(), () =>
      rpc.api.models.pricing.counts.get(),
    ),
    prefetchElysia(queryClient, queryKeys.pricingVendors(), () =>
      rpc.api.models.pricing.vendors.get(),
    ),
    prefetchElysia(queryClient, queryKeys.statsHistory(), () =>
      rpc.api.ops.stats.history.get(),
    ),
  ]);

  return (
    <>
      <JsonLd
        id="home-software-app"
        data={buildSoftwareApplicationSchema({
          locale,
          description: t("HOME.META.DESCRIPTION"),
          modelCount: counts?.models,
        })}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Home />
      </HydrationBoundary>
    </>
  );
}
