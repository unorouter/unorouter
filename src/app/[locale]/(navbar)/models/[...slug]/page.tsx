import { ModelDetail } from "@/components/pages/navbar/models/detail/model-detail";
import { ModelSchema } from "@/components/pages/navbar/models/detail/model-schema";
import {
  canonicalHref,
  resolveSlug,
  vendorHref,
} from "@/components/pages/navbar/models/detail/resolve-slug";
import { VendorModelsPage } from "@/components/pages/navbar/models/vendor/vendor-page";
import { localeUrl } from "@/i18n/navigation";
import { modelDisplayName, vendorDisplayName } from "@/lib/api/pricing";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { getPricingCatalog } from "@/openapi";
import { hasRealVendor, unwrap, vendorSlug } from "@/lib/utils/base";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import {
  getPageMetadata,
  MODEL_PAGE_LOCALES,
  notFoundMetadata,
  ogBadge,
} from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { notFound, permanentRedirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata(props: PageProps) {
  const locale = await serverLocale(props);
  const resolved = await resolveSlug((await props.params).slug);
  const t = await getTranslations({ locale });

  // An empty object inherits the parent (home) metadata: "index, follow" plus a
  // canonical pointing at /<locale>, which Google reads as a soft 404 on a real
  // page. Emit the noindex head here instead.
  if (!resolved) return notFoundMetadata();

  // The page redirects this one, so the head never ships. Skip the noindex that
  // a missing branch would otherwise emit.
  if (resolved.kind === "redirect" || resolved.kind === "retired") return {};

  const indexed = MODEL_PAGE_LOCALES.some((l) => l === locale);

  if (resolved.kind === "vendor") {
    const vendor = resolved.vendor;
    return getPageMetadata({
      locale,
      href: vendorHref(vendor),
      title: t("MODELS.VENDOR.META_TITLE", { ...APP_VALUES, vendor }),
      description: t("MODELS.VENDOR.META_DESC", { ...APP_VALUES, vendor }),
      keywords: t("MODELS.VENDOR.META_KEYWORDS", { ...APP_VALUES, vendor }),
      ogImage: ogBadge("sponsor", locale),
      locales: MODEL_PAGE_LOCALES,
      // "unknown" collects models with no vendor; it is not a real provider.
      robots: indexed && vendorSlug(vendor) !== "unknown",
    });
  }

  const model = resolved.model.model;
  // A :free page mostly repeats its paid sibling; pointing Google at the paid
  // page consolidates them instead of leaving thousands discovered, not indexed.
  const isFree = model.model_name.endsWith(":free");
  const baseName = isFree
    ? model.model_name.slice(0, -":free".length)
    : model.model_name;
  const paidSibling = isFree
    ? resolved.model.models.find((m) => m.model_name === baseName)
    : undefined;
  // People search "free DeepSeek V4 Pro API", not the ":free" id or the slug.
  const values = {
    ...APP_VALUES,
    name: modelDisplayName(paidSibling ?? model),
    vendor: vendorDisplayName(model.vendor),
  };
  return getPageMetadata({
    locale,
    href: canonicalHref(paidSibling ?? model),
    title: t(
      isFree ? "MODEL_PAGE.META_TITLE_FREE" : "MODEL_PAGE.META_TITLE",
      values,
    ),
    description: t(
      isFree ? "MODEL_PAGE.META_DESC_FREE" : "MODEL_PAGE.META_DESC",
      values,
    ),
    keywords: t(
      isFree ? "MODEL_PAGE.META_KEYWORDS_FREE" : "MODEL_PAGE.META_KEYWORDS",
      values,
    ),
    ogImage: ogBadge("model", locale, { model: model.model_name }),
    locales: MODEL_PAGE_LOCALES,
    robots: indexed && hasRealVendor(model.vendor),
  });
}

export default async function ModelDetailPage(props: PageProps) {
  const params = await props.params;
  const locale = await serverLocale(props);
  const resolved = await resolveSlug(params.slug);
  if (!resolved) notFound();

  if (resolved.kind === "redirect") {
    permanentRedirect(localeUrl(locale, canonicalHref(resolved.model)));
  }
  if (resolved.kind === "retired") {
    permanentRedirect(localeUrl(locale, vendorHref(resolved.vendor)));
  }

  if (resolved.kind === "vendor") {
    const vendor = resolved.vendor;
    const t = await getTranslations({ locale });
    const queryClient = getQueryClient();
    const vendorModels = unwrap(
      await getPricingCatalog({ vendor, include_offline: true }),
    ).models;
    queryClient.setQueryData(queryKeys.pricingVendor(vendor), vendorModels);
    const vendorUrl = localeUrl(locale, vendorHref(vendor));
    return (
      <>
        <JsonLd
          id="vendor-breadcrumb"
          data={buildBreadcrumbListSchema([
            { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
            { name: t("NAV.MODELS"), url: localeUrl(locale, "/models") },
            { name: vendorDisplayName(vendor), url: vendorUrl },
          ])}
        />
        <JsonLd
          id="vendor-collection"
          data={buildCollectionPageSchema({
            name: t("MODELS.VENDOR.META_TITLE", { ...APP_VALUES, vendor }),
            description: t("MODELS.VENDOR.META_DESC", {
              ...APP_VALUES,
              vendor,
            }),
            url: vendorUrl,
            items: vendorModels
              .filter((m) => m.online)
              .map((m) => ({
                name: m.model_name,
                url: localeUrl(locale, canonicalHref(m)),
              })),
          })}
        />
        <HydrationBoundary state={dehydrate(queryClient)}>
          <VendorModelsPage vendor={vendor} />
        </HydrationBoundary>
      </>
    );
  }

  const hit = resolved.model;
  const paidSibling = hit.model.model_name.endsWith(":free")
    ? hit.models.find(
        (m) => m.model_name === hit.model.model_name.slice(0, -":free".length),
      )
    : undefined;
  return (
    <>
      <ModelSchema
        model={hit.model}
        canonical={paidSibling ?? hit.model}
        hasFreeTwin={hit.models.some(
          (m) => m.model_name === `${hit.model.model_name}:free`,
        )}
        locale={locale}
        idSlug={params.slug.join("-")}
      />
      <ModelDetail
        model={hit.model}
        models={hit.models}
        groupRatioMap={hit.model.group_ratio}
        offline={hit.atCapacity}
        vendorHref={localeUrl(locale, vendorHref(hit.model.vendor))}
      />
    </>
  );
}
