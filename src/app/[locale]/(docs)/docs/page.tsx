import { DocsIndexContent } from "@/components/pages/docs/docs-index-content";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { getLocale, getTranslations } from "next-intl/server";


export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/docs",
    title: t("DOCS_INDEX.META.TITLE", APP_VALUES),
    description: t("DOCS_INDEX.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS_INDEX.META.KEYWORDS"),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function DocsPage() {
  const locale = await getLocale();
  const t = await getTranslations();
  return (
    <>
      <JsonLd
        id="docs-index-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: `/${locale}` },
          { name: t("NAV.DOCS"), url: `/${locale}/docs` },
        ])}
      />
      <DocsIndexContent />
    </>
  );
}
