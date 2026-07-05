import { prefetchElysia } from "@/lib/react-query/prefetch";
import { AtCapacityBanner } from "@/components/pages/navbar/models/detail/at-capacity-banner";
import { ModelDetail } from "@/components/pages/navbar/models/detail/model-detail";
import { localeUrl } from "@/i18n/navigation";
import { findContextTag, type ProcessedModel } from "@/lib/api/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildSoftwareApplicationSchema,
} from "@/lib/seo/structured-data";
import {
  baseModelName,
  handleElysia,
  modelMatchesSlug,
  modelSlug,
} from "@/lib/utils/base";
import { formatPrice } from "@/lib/utils/format/number";
import { serverLocale } from "@/lib/utils/server";
import { getCatalogModel } from "@/server/models/pricing/model-catalog.service";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

type ResolvedModel = {
  model: ProcessedModel;
  // true = absent from live pricing but recently seen: render at-capacity, 200.
  atCapacity: boolean;
  data: Awaited<ReturnType<typeof fetchPricing>>;
};

function fetchPricing() {
  return rpc.api.models.pricing
    .get()
    .then(handleElysia)
    .catch(() => null);
}

// Live pricing first; churned-out models fall back to the durable catalog so
// the page survives free-pool churn instead of 404ing (GSC: 495 churn 404s).
async function resolveModel(slug: string): Promise<ResolvedModel | null> {
  const data = await fetchPricing();
  const live = data?.models.find((m) => modelMatchesSlug(m.name, slug));
  if (live) return { model: live, atCapacity: false, data };
  const snapshot = await getCatalogModel((name) =>
    modelMatchesSlug(name, slug),
  ).catch(() => null);
  if (snapshot) return { model: snapshot, atCapacity: true, data };
  return null;
}

// A :free twin canonicalizes to its base model page when the base exists;
// free-only models (no paid sibling anywhere) stay self-canonical.
async function canonicalSlugFor(
  model: ProcessedModel,
  data: ResolvedModel["data"],
): Promise<string> {
  const base = baseModelName(model.name);
  if (base === model.name) return modelSlug(model.name);
  const baseLive = data?.models.some((m) => m.name === base);
  const baseCatalog = baseLive
    ? true
    : !!(await getCatalogModel((name) => name === base).catch(() => null));
  return modelSlug(baseLive || baseCatalog ? base : model.name);
}

export async function generateMetadata(props: PageProps) {
  const locale = await serverLocale(props);
  const params = await props.params;
  const resolved = await resolveModel(params.slug);
  if (!resolved) return {};
  const model = resolved.model;

  const canonicalSlug = await canonicalSlugFor(model, resolved.data);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: {
      pathname: "/models/[slug]",
      params: { slug: modelSlug(model.name) },
    },
    ...(canonicalSlug !== modelSlug(model.name) && {
      canonicalHref: {
        pathname: "/models/[slug]" as const,
        params: { slug: canonicalSlug },
      },
    }),
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
  const resolved = await resolveModel(params.slug);
  if (!resolved) notFound();
  const model = resolved.model;
  const data = resolved.data;

  const t = await getTranslations({ locale });
  const url = localeUrl(locale, {
    pathname: "/models/[slug]",
    params: { slug: modelSlug(model.name) },
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
        id={`${params.slug}-breadcrumb`}
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.MODELS"), url: localeUrl(locale, "/models") },
          { name: model.name, url },
        ])}
      />
      <JsonLd
        id={`${params.slug}-software`}
        data={buildSoftwareApplicationSchema({
          locale,
          name: model.name,
          url: localeUrl(locale, {
            pathname: "/models/[slug]",
            params: { slug: modelSlug(model.name) },
          }),
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
      <JsonLd id={`${params.slug}-faq`} data={buildFAQPageSchema(faqEntries)} />
      {resolved.atCapacity && <AtCapacityBanner locale={locale} />}
      <ModelDetail
        model={model}
        models={data?.models ?? [model]}
        groupRatioMap={data?.groupRatioMap ?? {}}
      />
    </HydrationBoundary>
  );
}
