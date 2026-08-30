import { localeUrl } from "@/i18n/navigation";
import { findContextTag, vendorDisplayName } from "@/lib/api/pricing";
import type { PricingCatalogDetail } from "@/openapi";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildProductSchema,
  buildSoftwareApplicationSchema,
} from "@/lib/seo/structured-data";
import { formatPrice } from "@/lib/utils/format/number";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { canonicalHref, vendorHref } from "./resolve-slug";

export async function ModelSchema(props: {
  model: PricingCatalogDetail;
  locale: Locale;
  idSlug: string;
}) {
  const model = props.model;
  const t = await getTranslations({ locale: props.locale });
  const url = localeUrl(props.locale, canonicalHref(model));
  const vendorUrl = localeUrl(props.locale, vendorHref(model.vendor));

  const description =
    model.description ??
    t("MODEL_PAGE.META_DESC", {
      ...APP_VALUES,
      name: model.model_name,
      vendor: model.vendor,
    });

  const contextTag = findContextTag(model);
  const faqEntries = [
    {
      question: model.is_tiered
        ? t("MODEL_PAGE.FAQ_COST_TIERED_Q", { name: model.model_name })
        : t("MODEL_PAGE.FAQ_COST_Q", { name: model.model_name }),
      answer: model.is_tiered
        ? t("MODEL_PAGE.FAQ_COST_TIERED_A", { name: model.model_name })
        : t("MODEL_PAGE.FAQ_COST_A", {
            name: model.model_name,
            input: formatPrice(model.input_price),
            output: formatPrice(model.output_price),
          }),
    },
    {
      question: t("MODEL_PAGE.FAQ_API_Q", { name: model.model_name }),
      answer: t("MODEL_PAGE.FAQ_API_A", {
        ...APP_VALUES,
        name: model.model_name,
      }),
    },
    ...(contextTag
      ? [
          {
            question: t("MODEL_PAGE.FAQ_CONTEXT_Q", { name: model.model_name }),
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
      <JsonLd
        id={`${props.idSlug}-software`}
        data={buildSoftwareApplicationSchema({
          locale: props.locale,
          name: model.model_name,
          url,
          brandName: model.vendor,
          description,
        })}
      />
      {/* Tiered pricing has no single input/output rate, so a Product offer
          would have to invent one. Omit the schema rather than mislead. */}
      {!model.is_tiered && (
        <JsonLd
          id={`${props.idSlug}-product`}
          data={buildProductSchema({
            name: model.model_name,
            url,
            isFree: model.model_name.endsWith(":free"),
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
