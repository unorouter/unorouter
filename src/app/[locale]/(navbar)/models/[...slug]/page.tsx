import { ModelDetail } from "@/components/pages/navbar/models/detail/model-detail";
import { VendorModelsPage } from "@/components/pages/navbar/models/vendor/vendor-page";
import { localeUrl } from "@/i18n/navigation";
import {
  findContextTag,
  type ProcessedModel,
  vendorDisplayName,
} from "@/lib/api/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildSoftwareApplicationSchema,
} from "@/lib/seo/structured-data";
import {
  modelMatchesSlug,
  modelSlug,
  vendorMatchesSlug,
  vendorSlug,
} from "@/lib/utils/base";
import { formatPrice } from "@/lib/utils/format/number";
import { serverLocale } from "@/lib/utils/server";
import { getCatalogModel } from "@/server/models/pricing/model-catalog.service";
import {
  fetchLivePricing,
  type LivePricing,
} from "@/server/models/pricing/pricing-fetch";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<{ tab?: string }>;
}

type ResolvedModel = {
  model: ProcessedModel;
  atCapacity: boolean;
  data: LivePricing;
};


// The canonical URL is 2-segment vendor/model; a 1-segment slug is a vendor page,
// never a model. The model identity is the LAST segment of a 2-segment slug.
function modelSegment(slug: string[]): string {
  if (slug.length !== 2) return "";
  return slug[1] ?? "";
}

// Live pricing first; churned-out models fall back to the durable catalog so
// the page survives free-pool churn instead of 404ing (GSC: 495 churn 404s).
async function resolveModel(slug: string): Promise<ResolvedModel | null> {
  if (!slug) return null;
  const data = await fetchLivePricing({ includeOffline: true });
  const live = data?.models.find((m) => modelMatchesSlug(m.name, slug));
  if (live) return { model: live, atCapacity: !live.online, data };
  const snapshot = await getCatalogModel((name) =>
    modelMatchesSlug(name, slug),
  ).catch(() => null);
  if (snapshot) return { model: snapshot, atCapacity: true, data };
  return null;
}

// A single-segment slug that matches no model but does match a vendor renders
// the vendor grid. Returns the canonical vendor display name, else null.
async function resolveVendor(slug: string[]): Promise<string | null> {
  if (slug.length !== 1) return null;
  const seg = slug[0]!;
  const pricing = await rpc.api.models.pricing.get().catch(() => null);
  const vendorNames = pricing?.data?.vendorNames ?? [];
  const match = vendorNames.find((v) => vendorMatchesSlug(v, seg));
  return match ?? null;
}

// The published (canonical) path is always the 2-segment vendor/model form.
function canonicalHref(model: ProcessedModel) {
  const vendor = vendorSlug(model.vendor.name) || "unknown";
  const slug = [vendor, modelSlug(model.name)];
  return { pathname: "/models/[...slug]" as const, params: { slug } };
}

export async function generateMetadata(props: PageProps) {
  const locale = await serverLocale(props);
  const params = await props.params;
  const resolved = await resolveModel(modelSegment(params.slug));
  const t = await getTranslations({ locale });

  if (!resolved) {
    const vendor = await resolveVendor(params.slug);
    if (!vendor) return {};
    return getPageMetadata({
      locale,
      href: {
        pathname: "/models/[...slug]",
        params: { slug: [vendorSlug(vendor)] },
      },
      title: t("MODELS.VENDOR.META_TITLE", { ...APP_VALUES, vendor }),
      description: t("MODELS.VENDOR.META_DESC", { ...APP_VALUES, vendor }),
      keywords: t("MODELS.VENDOR.META_KEYWORDS", { ...APP_VALUES, vendor }),
      ogImage: ogBadge("sponsor", locale),
    });
  }

  const model = resolved.model;
  return getPageMetadata({
    locale,
    href: canonicalHref(model),
    title: t("MODEL_PAGE.META_TITLE", {
      ...APP_VALUES,
      name: model.name,
      vendor: model.vendor.name,
    }),
    description: t("MODEL_PAGE.META_DESC", {
      ...APP_VALUES,
      name: model.name,
      vendor: model.vendor.name,
    }),
    keywords: t("MODEL_PAGE.META_KEYWORDS", {
      ...APP_VALUES,
      name: model.name,
      vendor: model.vendor.name,
    }),
    ogImage: ogBadge("model", locale, { model: model.name }),
  });
}

export default async function ModelDetailPage(props: PageProps) {
  const params = await props.params;
  const locale = await serverLocale(props);
  const resolved = await resolveModel(modelSegment(params.slug));

  // No model: try the vendor grid (single-segment only), else 404.
  if (!resolved) {
    const vendor = await resolveVendor(params.slug);
    if (!vendor) notFound();
    const vendorQc = getQueryClient();
    await prefetchElysia(vendorQc, queryKeys.pricing(), () =>
      rpc.api.models.pricing.get(),
    );
    return (
      <HydrationBoundary state={dehydrate(vendorQc)}>
        <VendorModelsPage vendor={vendor} />
      </HydrationBoundary>
    );
  }

  const model = resolved.model;
  const data = resolved.data;
  const t = await getTranslations({ locale });
  const url = localeUrl(locale, canonicalHref(model));
  const vendorUrl = localeUrl(locale, {
    pathname: "/models/[...slug]",
    params: { slug: [vendorSlug(model.vendor.name)] },
  });

  const queryClient = getQueryClient();
  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());
  if (isLoggedIn) {
    await prefetchElysia(queryClient, queryKeys.bestKey(), (cookies) =>
      rpc.api.billing.token["best-key"].get({ ...cookies }),
    );
  }

  const contextTag = findContextTag(model);
  const idSlug = params.slug.join("-");

  const faqEntries = [
    {
      question: model.isTiered
        ? t("MODEL_PAGE.FAQ_COST_TIERED_Q", { name: model.name })
        : t("MODEL_PAGE.FAQ_COST_Q", { name: model.name }),
      answer: model.isTiered
        ? t("MODEL_PAGE.FAQ_COST_TIERED_A", { name: model.name })
        : t("MODEL_PAGE.FAQ_COST_A", {
            name: model.name,
            input: formatPrice(model.inputPrice),
            output: formatPrice(model.outputPrice),
          }),
    },
    {
      question: t("MODEL_PAGE.FAQ_API_Q", { name: model.name }),
      answer: t("MODEL_PAGE.FAQ_API_A", {
        ...APP_VALUES,
        name: model.name,
      }),
    },
    ...(contextTag
      ? [
          {
            question: t("MODEL_PAGE.FAQ_CONTEXT_Q", { name: model.name }),
            answer: t("MODEL_PAGE.FAQ_CONTEXT_A", {
              name: model.name,
              context: contextTag,
            }),
          },
        ]
      : []),
  ];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JsonLd
        id={`${idSlug}-breadcrumb`}
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.MODELS"), url: localeUrl(locale, "/models") },
          { name: vendorDisplayName(model.vendor.name), url: vendorUrl },
          { name: model.name, url },
        ])}
      />
      <JsonLd
        id={`${idSlug}-software`}
        data={buildSoftwareApplicationSchema({
          locale,
          name: model.name,
          url,
          brandName: model.vendor.name,
          description:
            model.description ??
            t("MODEL_PAGE.META_DESC", {
              ...APP_VALUES,
              name: model.name,
              vendor: model.vendor.name,
            }),
        })}
      />
      <JsonLd id={`${idSlug}-faq`} data={buildFAQPageSchema(faqEntries)} />
      <ModelDetail
        model={model}
        models={data?.models ?? [model]}
        groupRatioMap={data?.groupRatioMap ?? {}}
        offline={resolved.atCapacity}
        vendorHref={vendorUrl}
      />
    </HydrationBoundary>
  );
}
