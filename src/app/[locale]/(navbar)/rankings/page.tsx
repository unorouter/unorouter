import { Rankings } from "@/components/pages/navbar/rankings/rankings";
import { APP_VALUES } from "@/lib/config/constants";
import { localeUrl } from "@/i18n/navigation";
import { getRankingsPageData } from "@/lib/api/page-data";
import { JsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { modelHref } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "RANKINGS",
    href: "/rankings",
    badge: "hero",
  });
}

// The period query param is resolved client-side after hydration; the server
// always renders the default week ranking.
export default async function RankingsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const period = "week" as const;
  const t = await getTranslations({ locale });
  const data = await getRankingsPageData(period);
  const topModels = data.topModels;

  return (
    <>
      <JsonLd
        id="rankings-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.RANKINGS"), url: localeUrl(locale, "/rankings") },
        ])}
      />
      <JsonLd
        id="rankings-collection"
        data={buildCollectionPageSchema({
          name: t("RANKINGS.META.TITLE", APP_VALUES),
          description: t("RANKINGS.META.DESCRIPTION", APP_VALUES),
          url: localeUrl(locale, "/rankings"),
          items: topModels.map((m) => ({
            name: m.model_name,
            url: localeUrl(locale, modelHref(m.model_name, m.vendor)),
            description: m.vendor,
          })),
        })}
      />
      <HydrationBoundary state={data.dehydrated}>
        <Rankings initialPeriod={period} />
      </HydrationBoundary>
    </>
  );
}
