import { ModelsPage } from "@/components/pages/navbar/models/models-page";
import { APP_VALUES } from "@/lib/config/constants";
import { emptyPageData, getModelsPageData } from "@/lib/api/cached";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { localeUrl } from "@/i18n/navigation";
import { modelSlug, vendorSlug } from "@/lib/utils/base";
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
    href: "/models",
    title: t("MODELS.META.TITLE", APP_VALUES),
    description: t("MODELS.META.DESCRIPTION"),
    keywords: t("MODELS.META.KEYWORDS"),
    ogImage: ogBadge("sponsor", locale),
  });
}

export default async function Page(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const data = await getModelsPageData().catch(() => emptyPageData());
  const topModels = data.topModels;

  return (
    <>
      <JsonLd
        id="models-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.MODELS"), url: localeUrl(locale, "/models") },
        ])}
      />
      <JsonLd
        id="models-collection"
        data={buildCollectionPageSchema({
          name: t("MODELS.META.TITLE", APP_VALUES),
          description: t("MODELS.META.DESCRIPTION"),
          url: localeUrl(locale, "/models"),
          items: topModels
            .filter((m) => vendorSlug(m.vendorName))
            .map((m) => ({
              name: m.name,
              url: localeUrl(locale, {
                pathname: "/models/[...slug]",
                params: {
                  slug: [vendorSlug(m.vendorName), modelSlug(m.name)],
                },
              }),
              description: m.description ?? m.vendorName,
            })),
        })}
      />
      <HydrationBoundary state={data.dehydrated}>
        <ModelsPage />
      </HydrationBoundary>
    </>
  );
}
