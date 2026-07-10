import { ComparePage } from "@/components/pages/navbar/models/compare/compare-page";
import { APP_VALUES } from "@/lib/config/constants";
import { localeUrl } from "@/i18n/navigation";
import { getComparePageData } from "@/lib/api/cached";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
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
    href: "/compare",
    title: t("MODELS.COMPARE.META.TITLE", APP_VALUES),
    description: t("MODELS.COMPARE.META.DESCRIPTION"),
    keywords: t("MODELS.COMPARE.META.KEYWORDS"),
    ogImage: ogBadge("compare", locale),
  });
}

export default async function Page(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const data = await getComparePageData([]);

  return (
    <>
      <JsonLd
        id="compare-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          {
            name: t("MODELS.COMPARE.TITLE"),
            url: localeUrl(locale, "/compare"),
          },
        ])}
      />
      <HydrationBoundary state={data.dehydrated}>
        <ComparePage />
      </HydrationBoundary>
    </>
  );
}
