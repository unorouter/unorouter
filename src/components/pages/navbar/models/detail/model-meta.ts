import { modelDisplayName, vendorDisplayName } from "@/lib/api/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import { fitTitle, TITLE_LIMIT } from "@/lib/seo/metadata";
import { formatPriceCompact } from "@/lib/utils/format/number";
import type { useTranslations } from "next-intl";
import type { ResolvedModel } from "./resolve-slug";

type Translator = ReturnType<typeof useTranslations<never>>;

const FREE_SUFFIX = ":free";

export function paidSiblingOf(hit: ResolvedModel) {
  const name = hit.model.model_name;
  if (!name.endsWith(FREE_SUFFIX)) return undefined;
  const base = name.slice(0, -FREE_SUFFIX.length);
  return hit.models.find((m) => m.model_name === base);
}

export function modelMetaText(t: Translator, hit: ResolvedModel) {
  const model = hit.model;
  const paid = paidSiblingOf(hit);
  const isFreeId = model.model_name.endsWith(FREE_SUFFIX);
  // A :free page sells nothing itself; its paid sibling carries the real price.
  const priced = paid ?? model;
  const freeOnly = priced.is_free || (isFreeId && !paid);
  const hasFree =
    freeOnly ||
    isFreeId ||
    hit.models.some((m) => m.model_name === model.model_name + FREE_SUFFIX);
  // The catalog row of a paid sibling carries no tier flag, only the detail does.
  const tiered = !paid && model.is_tiered;
  const values = {
    ...APP_VALUES,
    name: modelDisplayName(priced),
    vendor: vendorDisplayName(model.vendor),
    input: formatPriceCompact(priced.input_price),
    output: formatPriceCompact(priced.output_price),
    price: formatPriceCompact(priced.fixed_price),
    free: hasFree ? "yes" : "no",
    fixed: priced.is_fixed_price ? "yes" : "no",
  };

  let title = t("MODEL_PAGE.META_TITLE_FREE_ONLY", values);
  if (!freeOnly) {
    const long = hasFree
      ? t("MODEL_PAGE.META_TITLE_FREE", values)
      : t("MODEL_PAGE.META_TITLE", values);
    const short = hasFree
      ? t("MODEL_PAGE.META_TITLE_FREE_SHORT", values)
      : t("MODEL_PAGE.META_TITLE_SHORT", values);
    title = fitTitle(long).length <= TITLE_LIMIT ? long : short;
  }

  let description = t("MODEL_PAGE.META_DESC", values);
  if (freeOnly) description = t("MODEL_PAGE.META_DESC_FREE_ONLY", values);
  else if (tiered) description = t("MODEL_PAGE.META_DESC_TIERED", values);
  else if (priced.is_fixed_price)
    description = t("MODEL_PAGE.META_DESC_FIXED", values);
  else if (hasFree) description = t("MODEL_PAGE.META_DESC_FREE", values);

  return {
    title,
    description,
    keywords: hasFree
      ? t("MODEL_PAGE.META_KEYWORDS_FREE", values)
      : t("MODEL_PAGE.META_KEYWORDS", values),
  };
}
