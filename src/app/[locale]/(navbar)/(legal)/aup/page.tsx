import { AupContent } from "@/components/pages/legal/aup-content";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
} from "@/lib/seo/structured-data";
import { getSeoTimestamps } from "@/lib/seo/metadata";
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
    href: "/aup",
    title: t("AUP.META.TITLE", APP_VALUES),
    description: t("AUP.META.DESCRIPTION", APP_VALUES),
    keywords: t("AUP.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("providers", locale),
  });
}

export default async function AupPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations();
  const ts = getSeoTimestamps("legal/aup");

  return (
    <>
      <JsonLd
        id="aup-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("AUP.TITLE"), url: localeUrl(locale, "/aup") },
        ])}
      />
      <JsonLd
        id="aup-article"
        data={buildArticleSchema({
          locale,
          headline: t("AUP.TITLE"),
          description: t("AUP.META.DESCRIPTION", APP_VALUES),
          url: localeUrl(locale, "/aup"),
          datePublished: ts?.published,
          dateModified: ts?.modified,
          author: { type: "Organization", name: APP_VALUES.appName },
        })}
      />
      <AupContent />
    </>
  );
}
