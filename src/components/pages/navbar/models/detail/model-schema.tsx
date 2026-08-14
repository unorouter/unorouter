import { localeUrl } from "@/i18n/navigation";
import { findContextTag, type ProcessedModel } from "@/lib/api/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildProductSchema,
  buildSoftwareApplicationSchema,
} from "@/lib/seo/structured-data";
import { formatPrice } from "@/lib/utils/format/number";
import { vendorDisplayName } from "@/lib/api/pricing";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { canonicalHref, vendorHref } from "./resolve-slug";

export async function ModelSchema(props: {
  model: ProcessedModel;
  locale: Locale;
  idSlug: string;
}) {
  const model = props.model;
  const t = await getTranslations({ locale: props.locale });
  const url = localeUrl(props.locale, canonicalHref(model));
  const vendorUrl = localeUrl(props.locale, vendorHref(model.vendor.name));

  const description =
    model.description ??
    t("MODEL_PAGE.META_DESC", {
      ...APP_VALUES,
      name: model.name,
      vendor: model.vendor.name,
    });

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
      answer: t("MODEL_PAGE.FAQ_API_A", { ...APP_VALUES, name: model.name }),
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
        id={`${props.idSlug}-breadcrumb`}
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(props.locale, "/") },
          { name: t("NAV.MODELS"), url: localeUrl(props.locale, "/models") },
          { name: vendorDisplayName(model.vendor.name), url: vendorUrl },
          { name: model.name, url },
        ])}
      />
      <JsonLd
        id={`${props.idSlug}-software`}
        data={buildSoftwareApplicationSchema({
          locale: props.locale,
          name: model.name,
          url,
          brandName: model.vendor.name,
          description,
        })}
      />
      {/* Tiered pricing has no single input/output rate, so a Product offer
          would have to invent one. Omit the schema rather than mislead. */}
      {!model.isTiered && (
        <JsonLd
          id={`${props.idSlug}-product`}
          data={buildProductSchema({
            name: model.name,
            url,
            isFree: model.name.endsWith(":free"),
            inputPrice: model.inputPrice,
            outputPrice: model.outputPrice,
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
