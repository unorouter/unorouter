import { ComparePage } from "@/components/pages/navbar/models/compare/compare-page";
import {
  comboModelList,
  comboTitle,
} from "@/components/pages/navbar/models/compare/compare-text";
import { localeUrl } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { emptyPageData, getComparePageData } from "@/lib/api/page-data";
import { JsonLd } from "@/lib/seo/json-ld";
import { COMPARE_PAIRS } from "@/components/pages/navbar/models/compare/compare-pairs";
import {
  getPageMetadata,
  MODEL_PAGE_LOCALES,
  notFoundMetadata,
  ogBadge,
} from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
import { modelSlug } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slugs?: string[] }>;
}) {
  const params = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const resolved = await getComparePageData(params.slugs ?? []).catch(() =>
    emptyPageData(),
  );
  if (resolved.missing) return notFoundMetadata();
  const models = resolved.models;

  if (models.length === 0) {
    return getPageMetadata({
      locale,
      href: "/compare",
      title: t("MODELS.COMPARE.META.TITLE", APP_VALUES),
      description: t("MODELS.COMPARE.META.DESCRIPTION", APP_VALUES),
      keywords: t("MODELS.COMPARE.META.KEYWORDS"),
      ogImage: ogBadge("sponsor", locale),
    });
  }

  const title = t("MODELS.COMPARE.META.TITLE_COMBO", {
    models: comboTitle(models),
  });
  const description = t("MODELS.COMPARE.META.DESCRIPTION_COMBO", {
    models: comboModelList(models, t("MODELS.COMPARE.FROM")),
  });
  const sortedSlugs = models.map((m) => modelSlug(m.model_name)).sort();
  // Any combination of models resolves, so only the curated pairs are indexed,
  // and only in the locales where model pages themselves are indexed.
  const curated = COMPARE_PAIRS.some(
    (pair) =>
      pair
        .map((name) => modelSlug(name))
        .sort()
        .join("|") === sortedSlugs.join("|"),
  );
  return getPageMetadata({
    locale,
    href: {
      pathname: "/compare/[...slugs]",
      params: { slugs: models.map((m) => modelSlug(m.model_name)) },
    },
    canonicalHref: {
      pathname: "/compare/[...slugs]",
      params: { slugs: sortedSlugs },
    },
    title,
    description,
    keywords: t("MODELS.COMPARE.META.KEYWORDS"),
    locales: MODEL_PAGE_LOCALES,
    robots: curated && MODEL_PAGE_LOCALES.some((l) => l === locale),
    ogImage: ogBadge("compare", locale, {
      models: models.slice(0, 2).map((m) => m.model_name),
    }),
  });
}

export default async function Page(props: {
  params: Promise<{ locale: string; slugs?: string[] }>;
}) {
  const params = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const data = await getComparePageData(params.slugs ?? []).catch(() =>
    emptyPageData(),
  );
  if (data.missing) notFound();
  const models = data.models;

  const crumbs = [
    { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
    { name: t("MODELS.COMPARE.TITLE"), url: localeUrl(locale, "/compare") },
  ];
  if (models.length > 0) {
    crumbs.push({
      name: comboTitle(models),
      url: localeUrl(locale, {
        pathname: "/compare/[...slugs]",
        params: { slugs: models.map((m) => modelSlug(m.model_name)).sort() },
      }),
    });
  }

  return (
    <>
      <JsonLd
        id="compare-breadcrumb"
        data={buildBreadcrumbListSchema(crumbs)}
      />
      <HydrationBoundary state={data.dehydrated}>
        <ComparePage />
      </HydrationBoundary>
    </>
  );
}
