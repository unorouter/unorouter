import { localeUrl } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/types";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, getSeoTimestamps, ogBadge } from "@/lib/seo/metadata";
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
} from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

type LegalSlug = "aup" | "privacy" | "refund" | "terms";

const nsOf = (slug: LegalSlug) => slug.toUpperCase();
const key = (slug: LegalSlug, leaf: string) =>
  `${nsOf(slug)}.${leaf}` as TranslationKey;

export async function legalMetadata(
  slug: LegalSlug,
  props: { params: Promise<{ locale: string }> },
) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: `/${slug}`,
    title: t(key(slug, "META.TITLE"), APP_VALUES),
    description: t(key(slug, "META.DESCRIPTION"), APP_VALUES),
    keywords: t(key(slug, "META.KEYWORDS"), APP_VALUES),
    ogImage: ogBadge("providers", locale),
  });
}

export async function LegalPage(props: {
  slug: LegalSlug;
  params: Promise<{ locale: string }>;
  children: ReactNode;
}) {
  const slug = props.slug;
  const locale = await serverLocale(props);
  const t = await getTranslations();
  const ts = getSeoTimestamps(`legal/${slug}`);
  const url = localeUrl(locale, `/${slug}`);

  return (
    <>
      <JsonLd
        id={`${slug}-breadcrumb`}
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t(key(slug, "TITLE")), url },
        ])}
      />
      <JsonLd
        id={`${slug}-article`}
        data={buildArticleSchema({
          locale,
          headline: t(key(slug, "TITLE")),
          description: t(key(slug, "META.DESCRIPTION"), APP_VALUES),
          url,
          datePublished: ts?.published,
          dateModified: ts?.modified,
          author: { type: "Organization", name: APP_VALUES.appName },
        })}
      />
      {props.children}
    </>
  );
}
