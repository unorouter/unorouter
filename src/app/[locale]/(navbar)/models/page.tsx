import { ModelsPage } from "@/components/pages/navbar/models/models-page";
import { APP_VALUES } from "@/lib/config/constants";
import { emptyPageData, getModelsPageData } from "@/lib/api/cached";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { Link, localeUrl } from "@/i18n/navigation";
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
      {/* Server-rendered vendor directory: the models table above is fully
          client-rendered, so without this block the page exposes ZERO
          crawlable links into the ~20k model/vendor pages - Google knew them
          only from the sitemap (17k stuck in Discovered - currently not
          indexed). Vendor pages link every one of their models, so this one
          hop makes the whole model graph reachable. */}
      {data.vendorNames.length > 0 && (
        <section className="mx-auto w-full max-w-360 px-4 pb-12 md:px-6">
          <h2 className="text-muted-foreground mb-3 text-sm font-bold tracking-wider uppercase">
            {t("MODELS.VENDOR.BROWSE_ALL")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {data.vendorNames
              .filter((vendor) => vendorSlug(vendor))
              .map((vendor) => (
                <li key={vendor}>
                  <Link
                    href={{
                      pathname: "/models/[...slug]",
                      params: { slug: [vendorSlug(vendor)] },
                    }}
                    className="text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-block rounded-md border px-2 py-1 text-xs transition-colors"
                  >
                    {vendor}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </>
  );
}
