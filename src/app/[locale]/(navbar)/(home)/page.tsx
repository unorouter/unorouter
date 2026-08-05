import { Home } from "@/components/pages/navbar/home/home";
import { APP_VALUES } from "@/lib/config/constants";
import {
  getCachedPricingCounts,
  getDehydratedStatsHistory,
} from "@/lib/api/cached";
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

  // Hero counts come from the tiny counts slice (4 ints), never the ~325kB
  // pricing summary: awaiting the full summary here suspended the whole page and
  // painted footer-first. The model ticker (ssr:false) fetches the full lean
  // pricing client-side after load.
  const [counts, statsState] = await Promise.all([
    getCachedPricingCounts().catch(() => null),
    getDehydratedStatsHistory(),
  ]);

  return (
    <>
      <JsonLd
        id="home-software-app"
        data={buildSoftwareApplicationSchema({
          locale,
          description: t("HOME.META.DESCRIPTION"),
          modelCount: counts?.modelCount,
        })}
      />
      <HydrationBoundary state={statsState}>
        <Home
          counts={{
            modelCount: counts?.modelCount ?? 0,
            vendorCount: counts?.vendorCount ?? 0,
            freeCount: counts?.freeCount ?? 0,
            paidCount: counts?.paidCount ?? 0,
          }}
        />
      </HydrationBoundary>
    </>
  );
}
