import { localeUrl } from "@/i18n/navigation";
import {
  findContextTag,
  modelDisplayName,
  vendorDisplayName,
} from "@/lib/api/pricing";
import type { PricingCatalogDetail } from "@/openapi";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildModelSchema,
} from "@/lib/seo/structured-data";
import { formatPriceCompact } from "@/lib/utils/format/number";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { canonicalHref, vendorHref } from "./resolve-slug";

export async function ModelSchema(props: {
  model: PricingCatalogDetail;
  hasFreeTwin: boolean;
  // The page canonical: a :free page points at its paid sibling.
  canonical: { model_name: string; vendor: string };
  locale: Locale;
  fallbackDescription: string;
  idSlug: string;
}) {
  const model = props.model;
  const t = await getTranslations({ locale: props.locale });
  const url = localeUrl(props.locale, canonicalHref(props.canonical));
  const displayName = modelDisplayName(model);
  const vendorUrl = localeUrl(props.locale, vendorHref(model.vendor));

  const description = model.description ?? props.fallbackDescription;

  const contextTag = findContextTag(model);
  const faqEntries = [
    {
      question: model.is_tiered
        ? t("MODEL_PAGE.FAQ_COST_TIERED_Q", { name: displayName })
        : t("MODEL_PAGE.FAQ_COST_Q", { name: displayName }),
      answer: model.is_tiered
        ? t("MODEL_PAGE.FAQ_COST_TIERED_A", { name: model.model_name })
        : t("MODEL_PAGE.FAQ_COST_A", {
            name: model.model_name,
            input: formatPriceCompact(model.input_price),
            output: formatPriceCompact(model.output_price),
          }),
    },
    ...(props.hasFreeTwin
      ? [
          {
            question: t("MODEL_PAGE.FAQ_FREE_Q", { name: displayName }),
            answer: t("MODEL_PAGE.FAQ_FREE_A", {
              ...APP_VALUES,
              name: model.model_name,
            }),
          },
        ]
      : []),
    {
      question: t("MODEL_PAGE.FAQ_API_Q", { name: displayName }),
      answer: t("MODEL_PAGE.FAQ_API_A", {
        ...APP_VALUES,
        name: model.model_name,
      }),
    },
    ...(contextTag
      ? [
          {
            question: t("MODEL_PAGE.FAQ_CONTEXT_Q", { name: displayName }),
            answer: t("MODEL_PAGE.FAQ_CONTEXT_A", {
              name: model.model_name,
              context: contextTag,
            }),
          },
        ]
      : []),
  ];

  return (
    <>
      <JsonLd
        id={`${props.idSlug}-breadcrumb`}
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(props.locale, "/") },
          { name: t("NAV.MODELS"), url: localeUrl(props.locale, "/models") },
          { name: vendorDisplayName(model.vendor), url: vendorUrl },
          { name: model.model_name, url },
        ])}
      />
      {/* Tiered pricing has no single input/output rate, so an offer would
          have to invent one. Omit the schema rather than mislead. */}
      {!model.is_tiered && (
        <JsonLd
          id={`${props.idSlug}-software`}
          data={buildModelSchema({
            name: model.model_name,
            url,
            image: ogBadge("model", props.locale, { model: model.model_name }),
            vendorName: vendorDisplayName(model.vendor),
            isFree: model.is_free,
            inputPrice: model.input_price,
            outputPrice: model.output_price,
            description,
          })}
        />
      )}
      <JsonLd
        id={`${props.idSlug}-faq`}
        data={buildFAQPageSchema(faqEntries)}
      />
    </>
  );
}
