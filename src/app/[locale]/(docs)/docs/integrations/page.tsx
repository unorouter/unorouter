import { DocsIndexContent } from "@/components/pages/docs/docs-index-content";
import { DOCS_REGISTRY } from "@/i18n/registry";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { localeUrl } from "@/i18n/navigation";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/docs/integrations",
    title: t("DOCS_INDEX.META.TITLE", APP_VALUES),
    description: t("DOCS_INDEX.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS_INDEX.META.KEYWORDS"),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function DocsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations();
  const docs = DOCS_REGISTRY.filter((d) =>
    d.slug.startsWith("docs/integrations/"),
  );

  return (
    <>
      <JsonLd
        id="docs-index-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.DOCS"), url: localeUrl(locale, "/docs/integrations") },
        ])}
      />
      <JsonLd
        id="docs-index-collection"
        data={buildCollectionPageSchema({
          name: t("DOCS_INDEX.META.TITLE", APP_VALUES),
          description: t("DOCS_INDEX.META.DESCRIPTION", APP_VALUES),
          url: localeUrl(locale, "/docs/integrations"),
          items: docs.map((d) => ({
            name: t(`${d.i18nPrefix}.TITLE`, APP_VALUES),
            url: localeUrl(locale, d.path),
            description: t(`${d.i18nPrefix}.SUBTITLE`, APP_VALUES),
          })),
        })}
      />
      <DocsIndexContent />
    </>
  );
}
