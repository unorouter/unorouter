import { ModelDetail } from "@/components/pages/navbar/models/detail/model-detail";
import { findContextTag, formatTokenPrice } from "@/lib/api/pricing";
import { APP_VALUES, LOCALES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildProductSchema,
} from "@/lib/seo/structured-data";
import { localeUrl } from "@/i18n/navigation";
import { handleElysia } from "@/lib/utils/base";
import { serverLocale, serverPathname, setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const data = await rpc.api.pricing
    .get()
    .then(handleElysia)
    .catch(() => null);
  return (data?.models ?? []).flatMap((model) =>
    LOCALES.map((locale) => ({ locale, slug: model.name })),
  );
}

export async function generateMetadata(props: PageProps) {
  const locale = await serverLocale(props);
  const params = await props.params;
  const data = await rpc.api.pricing
    .get()
    .then(handleElysia)
    .catch(() => null);
  const model = data?.models.find((m) => m.name === params.slug);
  if (!model) return {};

  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: { pathname: "/models/[slug]", params: { slug: model.name } },
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
    ogImage: ogBadge("sponsor", locale),
  });
}

export default async function ModelDetailPage(props: PageProps) {
  const params = await props.params;
  const locale = await serverLocale(props);
  const data = await rpc.api.pricing
    .get()
    .then(handleElysia)
    .catch(() => null);
  const model = data?.models.find((m) => m.name === params.slug);
  if (!model || !data) notFound();

  const t = await getTranslations({ locale });
  const url = await serverPathname(locale);

  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () =>
      handleElysia(await rpc.api.auth.self.get(cookieHeaders!)),
  });
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());
  if (isLoggedIn) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.bestKey(),
      queryFn: async () =>
        handleElysia(
          await rpc.api.token["best-key"].get({ ...cookieHeaders }),
        ),
    });
  }

  const contextTag = findContextTag(model);

  const faqEntries = [
    {
      question: t("MODEL_PAGE.FAQ_COST_Q", { name: model.name }),
      answer: t("MODEL_PAGE.FAQ_COST_A", {
        name: model.name,
        input: formatTokenPrice(model.inputPrice),
        output: formatTokenPrice(model.outputPrice),
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
        id={`${params.slug}-product`}
        data={buildProductSchema({
          name: model.name,
          description:
            model.description ??
            t("MODEL_PAGE.META_DESC", {
              ...APP_VALUES,
              name: model.name,
              vendor: model.vendor.name,
            }),
          url,
          brandName: model.vendor.name,
          price: model.inputPrice ?? undefined,
          priceCurrency: "USD",
          priceUnit: "per 1K input tokens",
        })}
      />
      <JsonLd id={`${params.slug}-faq`} data={buildFAQPageSchema(faqEntries)} />
      <ModelDetail model={model} models={data.models} />
    </HydrationBoundary>
  );
}
