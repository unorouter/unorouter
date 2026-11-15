import { findContextTag, modelDisplayName } from "@/lib/api/pricing";
import { EMPTY_METADATA } from "@/lib/api/model-modality";
import { APP_VALUES } from "@/lib/config/constants";
import {
  formatPrice,
  formatPriceCompact,
  formatTokenCount,
} from "@/lib/utils/format/number";
import { formatYearMonth } from "@/lib/utils/format/date";
import type { ModelMetadata, PricingCatalogDetail } from "@/openapi";
import type { useTranslations } from "next-intl";

export type FaqItem = { q: string; a: string };

// Shared by the visible FAQ and its JSON-LD, so the two can never disagree.
export function modelFaqItems(
  t: ReturnType<typeof useTranslations<never>>,
  m: PricingCatalogDetail,
  hasFreeTwin: boolean,
  locale: string,
): FaqItem[] {
  const meta: ModelMetadata = m.metadata ?? EMPTY_METADATA;
  const name = m.model_name;
  // Questions use the name people search; answers keep the exact id to paste.
  const displayName = modelDisplayName(m);
  const items: FaqItem[] = [];

  if (m.is_fixed_price) {
    items.push({
      q: t("MODEL_PAGE.FAQ_COST_FIXED_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_COST_FIXED_A", {
        name,
        price: formatPrice(m.fixed_price),
      }),
    });
  } else if (m.is_tiered) {
    items.push({
      q: t("MODEL_PAGE.FAQ_COST_TIERED_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_COST_TIERED_A", { name }),
    });
  } else if (m.grid_pricing) {
    items.push({
      q: t("MODEL_PAGE.FAQ_COST_GRID_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_COST_GRID_A", { name }),
    });
  } else {
    items.push({
      q: t("MODEL_PAGE.FAQ_COST_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_COST_A", {
        name,
        input: formatPriceCompact(m.input_price),
        output: formatPriceCompact(m.output_price),
      }),
    });
  }

  const contextTag = findContextTag(m);
  if (contextTag) {
    items.push({
      q: t("MODEL_PAGE.FAQ_CONTEXT_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_CONTEXT_A", { name, context: contextTag }),
    });
  }

  if (meta.maxOutputTokens) {
    items.push({
      q: t("MODEL_PAGE.FAQ_OUTPUT_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_OUTPUT_A", {
        name,
        value: formatTokenCount(meta.maxOutputTokens, locale),
      }),
    });
  }

  if (meta.supportsTools) {
    items.push({
      q: t("MODEL_PAGE.FAQ_TOOLS_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_TOOLS_A", { name }),
    });
  }

  if (meta.isReasoning || (meta.reasoningEfforts?.length ?? 0) > 0) {
    items.push({
      q: t("MODEL_PAGE.FAQ_REASONING_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_REASONING_A", { name }),
    });
  }

  if (meta.supportsVision) {
    items.push({
      q: t("MODEL_PAGE.FAQ_VISION_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_VISION_A", { name }),
    });
  }

  const cutoff = formatYearMonth(meta.knowledgeCutoff);
  if (cutoff) {
    items.push({
      q: t("MODEL_PAGE.FAQ_CUTOFF_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_CUTOFF_A", { name, value: cutoff }),
    });
  }

  if (meta.isModerated === true) {
    items.push({
      q: t("MODEL_PAGE.FAQ_MODERATED_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_MODERATED_A", { name }),
    });
  }

  if (hasFreeTwin) {
    items.push({
      q: t("MODEL_PAGE.FAQ_FREE_Q", { name: displayName }),
      a: t("MODEL_PAGE.FAQ_FREE_A", { ...APP_VALUES, name }),
    });
  }

  items.push({
    q: t("MODEL_PAGE.FAQ_API_Q", { name: displayName }),
    a: t("MODEL_PAGE.FAQ_API_A", { ...APP_VALUES, name }),
  });

  return items;
}
