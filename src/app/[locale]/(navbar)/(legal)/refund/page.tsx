import { RefundContent } from "@/components/pages/legal/refund-content";
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
    href: "/refund",
    title: t("REFUND.META.TITLE", APP_VALUES),
    description: t("REFUND.META.DESCRIPTION", APP_VALUES),
    keywords: t("REFUND.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("providers", locale),
  });
}

export default async function RefundPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const ts = getSeoTimestamps("legal/refund");

  return (
    <>
      <JsonLd
        id="refund-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("REFUND.TITLE"), url: localeUrl(locale, "/refund") },
        ])}
      />
      <JsonLd
        id="refund-article"
        data={buildArticleSchema({
          locale,
          headline: t("REFUND.TITLE"),
          description: t("REFUND.META.DESCRIPTION", APP_VALUES),
          url: localeUrl(locale, "/refund"),
          datePublished: ts?.published,
          dateModified: ts?.modified,
          author: { type: "Organization", name: APP_VALUES.appName },
        })}
      />
      <RefundContent />
    </>
  );
}
