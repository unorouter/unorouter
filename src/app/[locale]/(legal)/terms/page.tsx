import { TermsContent } from "@/components/pages/legal/terms-content";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
} from "@/lib/seo/structured-data";
import { getSeoTimestamps } from "@/lib/seo/timestamps";
import { localeUrl } from "@/i18n/routing";
import { serverLocale } from "@/lib/utils/server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/terms",
    title: t("TERMS.META.TITLE", APP_VALUES),
    description: t("TERMS.META.DESCRIPTION", APP_VALUES),
    keywords: t("TERMS.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("providers", locale),
  });
}

export default async function TermsPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const ts = getSeoTimestamps("legal/terms");

  return (
    <>
      <JsonLd
        id="terms-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("TERMS.TITLE"), url: localeUrl(locale, "/terms") },
        ])}
      />
      <JsonLd
        id="terms-article"
        data={buildArticleSchema({
          locale,
          headline: t("TERMS.TITLE"),
          description: t("TERMS.META.DESCRIPTION", APP_VALUES),
          url: localeUrl(locale, "/terms"),
          datePublished: ts?.published,
          dateModified: ts?.modified,
          author: { type: "Organization", name: APP_VALUES.appName },
        })}
      />
      <TermsContent />
    </>
  );
}
