import { Home } from "@/components/pages/navbar/home/home";
import { APP_VALUES } from "@/lib/config/constants";
import { getCachedPricing, getDehydratedStatsHistory } from "@/lib/api/cached";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildSoftwareApplicationSchema } from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary } from "@tanstack/react-query";
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
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });

  // Pricing is fetched for the hero counts only and deliberately NOT put in
  // the query cache: dehydrating 700+ full model objects added ~2.3MB of RSC
  // flight payload to the homepage HTML (197KB brotli). The model ticker
  // (ssr:false, renders null until data) fetches it client-side after load.
  const [pricing, statsState] = await Promise.all([
    getCachedPricing().catch(() => null),
    getDehydratedStatsHistory(),
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
      <HydrationBoundary state={statsState}>
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
