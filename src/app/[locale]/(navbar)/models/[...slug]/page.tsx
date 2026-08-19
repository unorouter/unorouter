import { ModelDetail } from "@/components/pages/navbar/models/detail/model-detail";
import { ModelSchema } from "@/components/pages/navbar/models/detail/model-schema";
import {
  canonicalHref,
  resolveSlug,
  vendorHref,
} from "@/components/pages/navbar/models/detail/resolve-slug";
import { VendorModelsPage } from "@/components/pages/navbar/models/vendor/vendor-page";
import { localeUrl } from "@/i18n/navigation";
import { getPricingCatalog } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { unwrap } from "@/lib/utils/base";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { getPageMetadata, notFoundMetadata, ogBadge } from "@/lib/seo/metadata";
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
  if (resolved.kind === "redirect") return {};

  if (resolved.kind === "vendor") {
    const vendor = resolved.vendor;
    return getPageMetadata({
      locale,
      href: vendorHref(vendor),
      title: t("MODELS.VENDOR.META_TITLE", { ...APP_VALUES, vendor }),
      description: t("MODELS.VENDOR.META_DESC", { ...APP_VALUES, vendor }),
      keywords: t("MODELS.VENDOR.META_KEYWORDS", { ...APP_VALUES, vendor }),
      ogImage: ogBadge("sponsor", locale),
    });
  }

  const model = resolved.model.model;
  const values = {
    ...APP_VALUES,
    name: model.model_name,
    vendor: model.vendor,
  };
  return getPageMetadata({
    locale,
    href: canonicalHref(model),
    title: t("MODEL_PAGE.META_TITLE", values),
    description: t("MODEL_PAGE.META_DESC", values),
    keywords: t("MODEL_PAGE.META_KEYWORDS", values),
    ogImage: ogBadge("model", locale, { model: model.model_name }),
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

  if (resolved.kind === "vendor") {
    const queryClient = getQueryClient();
    queryClient.setQueryData(
      queryKeys.pricingVendor(resolved.vendor),
      unwrap(
        await getPricingCatalog(
          { vendor: resolved.vendor },
          { headers: ADMIN_HEADERS },
        ),
      ).models,
    );
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <VendorModelsPage vendor={resolved.vendor} />
      </HydrationBoundary>
    );
  }

  const hit = resolved.model;
  return (
    <>
      <ModelSchema
        model={hit.model}
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
