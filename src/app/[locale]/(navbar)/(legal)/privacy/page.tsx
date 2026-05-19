import { PrivacyContent } from "@/components/pages/legal/privacy-content";
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
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/privacy",
    title: t("PRIVACY.META.TITLE", APP_VALUES),
    description: t("PRIVACY.META.DESCRIPTION", APP_VALUES),
    keywords: t("PRIVACY.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("providers", locale),
  });
}

export default async function PrivacyPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const ts = getSeoTimestamps("legal/privacy");

  return (
    <>
      <JsonLd
        id="privacy-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("PRIVACY.TITLE"), url: localeUrl(locale, "/privacy") },
        ])}
      />
      <JsonLd
        id="privacy-article"
        data={buildArticleSchema({
          locale,
          headline: t("PRIVACY.TITLE"),
          description: t("PRIVACY.META.DESCRIPTION", APP_VALUES),
          url: localeUrl(locale, "/privacy"),
          datePublished: ts?.published,
          dateModified: ts?.modified,
          author: { type: "Organization", name: APP_VALUES.appName },
        })}
      />
      <PrivacyContent />
    </>
  );
}
