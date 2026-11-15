import { localeUrl } from "@/i18n/navigation";
import { vendorDisplayName } from "@/lib/api/pricing";
import type { PricingCatalogDetail } from "@/openapi";
import { JsonLd } from "@/lib/seo/json-ld";
import { ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildModelSchema,
} from "@/lib/seo/structured-data";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { modelFaqItems } from "./header/model-faq-items";
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
  const vendorUrl = localeUrl(props.locale, vendorHref(model.vendor));

  const description = model.description ?? props.fallbackDescription;

  const faqEntries = modelFaqItems(
    t,
    model,
    props.hasFreeTwin,
    props.locale,
  ).map((item) => ({ question: item.q, answer: item.a }));

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
      {/* Tiered, fixed and grid pricing have no single input/output rate, so an
          offer would have to invent one. Omit the schema rather than mislead. */}
      {!model.is_tiered && !model.is_fixed_price && !model.grid_pricing && (
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
