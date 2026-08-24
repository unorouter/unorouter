import { ComparePage } from "@/components/pages/navbar/models/compare/compare-page";
import { localeUrl } from "@/i18n/navigation";
import { emptyPageData, getComparePageData } from "@/lib/api/page-data";
import { JsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "MODELS.COMPARE",
    href: "/compare",
    badge: "compare",
  });
}

export default async function Page(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const data = await getComparePageData([]).catch(() => emptyPageData());

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
