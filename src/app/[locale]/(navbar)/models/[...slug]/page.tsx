import { ModelDetail } from "@/components/pages/navbar/models/detail/model-detail";
import { VendorModelsPage } from "@/components/pages/navbar/models/vendor/vendor-page";
import { localeUrl } from "@/i18n/navigation";
import {
  findContextTag,
  toLeanPricing,
  type ProcessedModel,
  vendorDisplayName,
} from "@/lib/api/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import { getCachedPricing } from "@/lib/api/cached";
import { getModelByName } from "@/server/models/pricing/pricing.service";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, notFoundMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildProductSchema,
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
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { notFound, permanentRedirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<{ tab?: string }>;
}

type ResolvedModel = {
  model: ProcessedModel;
  atCapacity: boolean;
  data: Awaited<ReturnType<typeof getCachedPricing>> | null;
};

function modelSegment(slug: string[]): string {
  if (slug.length !== 2) return "";
  return slug[1] ?? "";
}

async function resolveModel(slug: string): Promise<ResolvedModel | null> {
  if (!slug) return null;
  const data = await getCachedPricing(true).catch(() => null);
  const live = data?.models.find((m) => modelMatchesSlug(m.name, slug));
  if (live) return { model: live, atCapacity: !live.online, data };
  // Fully dark model (every channel disabled/deleted) is absent even from the
  // offline feed; the by-name route still returns it so the detail page renders.
  // modelSlug only percent-encodes []/, so the name decodes straight back.
  let name = slug;
  try {
    name = decodeURIComponent(slug);
  } catch {}
  const byName = await getModelByName(name).catch(() => null);
  if (byName) return { model: byName, atCapacity: true, data };
  return null;
}

async function resolveVendor(slug: string[]): Promise<string | null> {
  if (slug.length !== 1) return null;
  const seg = slug[0]!;
  const pricing = await getCachedPricing().catch(() => null);
  const vendorNames = pricing?.vendorNames ?? [];
  const match = vendorNames.find((v) => vendorMatchesSlug(v, seg));
  return match ?? null;
}

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
    if (!vendor) {
      const legacy =
        params.slug.length === 1 ? await resolveModel(params.slug[0]!) : null;
      if (legacy) {
        permanentRedirect(localeUrl(locale, canonicalHref(legacy.model)));
      }
      // An empty object inherits the parent (home) metadata: "index, follow"
      // plus a canonical pointing at /<locale>. cacheComponents streams the
      // shell before notFound() runs, so the 200 status can no longer be
      // changed and Google reads that inherited head as a soft 404 on a real
      // page. Emit the noindex head here, where it still lands in the shell.
      return notFoundMetadata();
    }
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

  if (!resolved) {
    const vendor = await resolveVendor(params.slug);
    if (!vendor) {
      // Pre-vendor-segment URLs (/models/<model>) are still crawled by Google
      // (773 not-found errors in Search Console); 301 them to the canonical
      // /models/<vendor>/<model> instead of 404ing.
      const legacy =
        params.slug.length === 1 ? await resolveModel(params.slug[0]!) : null;
      if (legacy) {
        permanentRedirect(localeUrl(locale, canonicalHref(legacy.model)));
      }
      notFound();
    }
    const vendorQc = getQueryClient();
    await vendorQc.prefetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => toLeanPricing(await getCachedPricing()),
    });
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
    <>
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
      {!model.isTiered && (
        <JsonLd
          id={`${idSlug}-product`}
          data={buildProductSchema({
            name: model.name,
            url,
            isFree: model.name.endsWith(":free"),
            inputPrice: model.inputPrice,
            outputPrice: model.outputPrice,
            description:
              model.description ??
              t("MODEL_PAGE.META_DESC", {
                ...APP_VALUES,
                name: model.name,
                vendor: model.vendor.name,
              }),
          })}
        />
      )}
      <JsonLd id={`${idSlug}-faq`} data={buildFAQPageSchema(faqEntries)} />
      <ModelDetail
        model={model}
        models={data?.models ?? [model]}
        groupRatioMap={data?.groupRatioMap ?? {}}
        offline={resolved.atCapacity}
        vendorHref={vendorUrl}
      />
    </>
  );
}
