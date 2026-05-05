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
  const reqId = Math.random().toString(36).slice(2, 8);
  const tag = (label: string) => `[home:${reqId}] ${label}`;
  console.time(tag("total"));

  console.time(tag("queryClient+locale+t"));
  const queryClient = getQueryClient();
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  console.timeEnd(tag("queryClient+locale+t"));

  console.time(tag("Promise.all rpc x3"));
  const [pricing] = await Promise.all([
    (async () => {
      console.time(tag("rpc.pricing.get"));
      const r = await queryClient.fetchQuery({
        queryKey: queryKeys.pricing(),
        queryFn: async () => handleElysia(await rpc.api.pricing.get()),
      });
      console.timeEnd(tag("rpc.pricing.get"));
      return r;
    })(),
    (async () => {
      console.time(tag("rpc.stats.history.get"));
      const r = await queryClient.prefetchQuery({
        queryKey: queryKeys.statsHistory(),
        queryFn: async () => handleElysia(await rpc.api.stats.history.get()),
      });
      console.timeEnd(tag("rpc.stats.history.get"));
      return r;
    })(),
    (async () => {
      console.time(tag("rpc.pricing.subscriptions.get"));
      const r = await queryClient.prefetchQuery({
        queryKey: queryKeys.subscriptionPlans(),
        queryFn: async () =>
          handleElysia(await rpc.api.pricing.subscriptions.get()),
      });
      console.timeEnd(tag("rpc.pricing.subscriptions.get"));
      return r;
    })(),
  ]);
  console.timeEnd(tag("Promise.all rpc x3"));

  queueMicrotask(() => console.timeEnd(tag("total")));

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
        <Home />
      </HydrationBoundary>
    </>
  );
}
