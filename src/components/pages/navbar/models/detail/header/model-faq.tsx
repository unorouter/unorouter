"use client";

import { Icon } from "@/components/ui/icon";
import { APP_VALUES } from "@/lib/config/constants";
import { findContextTag, type ProcessedModel } from "@/lib/api/pricing";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { SectionHeading } from "../shared/section-heading";
import { cn } from "@/lib/utils";
import { formatPrice, formatTokenCount } from "@/lib/utils/format/number";
import { formatYearMonth } from "@/lib/utils/format/date";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

type FaqItem = { q: string; a: string };

export function ModelFaq(props: { model: ProcessedModel }) {
  const t = useTranslations();
  const locale = useLocale();
  const m = props.model;
  const meta = m.metadata;
  const name = m.name;
  const theme = getVendorTheme(m.vendor.name);
  const items: FaqItem[] = [];
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) =>
    setOpen((cur) =>
      cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i],
    );

  if (m.isFixedPrice) {
    items.push({
      q: t("MODEL_PAGE.FAQ_COST_FIXED_Q", { name }),
      a: t("MODEL_PAGE.FAQ_COST_FIXED_A", {
        name,
        price: formatPrice(m.fixedPrice),
      }),
    });
  } else if (m.isTiered) {
    items.push({
      q: t("MODEL_PAGE.FAQ_COST_TIERED_Q", { name }),
      a: t("MODEL_PAGE.FAQ_COST_TIERED_A", { name }),
    });
  } else if (m.gridPricing) {
    items.push({
      q: t("MODEL_PAGE.FAQ_COST_GRID_Q", { name }),
      a: t("MODEL_PAGE.FAQ_COST_GRID_A", { name }),
    });
  } else {
    items.push({
      q: t("MODEL_PAGE.FAQ_COST_Q", { name }),
      a: t("MODEL_PAGE.FAQ_COST_A", {
        name,
        input: formatPrice(m.inputPrice),
        output: formatPrice(m.outputPrice),
      }),
    });
  }

  const contextTag = findContextTag(m);
  if (contextTag) {
    items.push({
      q: t("MODEL_PAGE.FAQ_CONTEXT_Q", { name }),
      a: t("MODEL_PAGE.FAQ_CONTEXT_A", { name, context: contextTag }),
    });
  }

  if (meta.maxOutputTokens) {
    items.push({
      q: t("MODEL_PAGE.FAQ_OUTPUT_Q", { name }),
      a: t("MODEL_PAGE.FAQ_OUTPUT_A", {
        name,
        value: formatTokenCount(meta.maxOutputTokens, locale),
      }),
    });
  }

  if (meta.supportsTools) {
    items.push({
      q: t("MODEL_PAGE.FAQ_TOOLS_Q", { name }),
      a: t("MODEL_PAGE.FAQ_TOOLS_A", { name }),
    });
  }

  if (meta.isReasoning || (meta.reasoningEfforts?.length ?? 0) > 0) {
    items.push({
      q: t("MODEL_PAGE.FAQ_REASONING_Q", { name }),
      a: t("MODEL_PAGE.FAQ_REASONING_A", { name }),
    });
  }

  if (meta.supportsVision) {
    items.push({
      q: t("MODEL_PAGE.FAQ_VISION_Q", { name }),
      a: t("MODEL_PAGE.FAQ_VISION_A", { name }),
    });
  }

  const cutoff = formatYearMonth(meta.knowledgeCutoff);
  if (cutoff) {
    items.push({
      q: t("MODEL_PAGE.FAQ_CUTOFF_Q", { name }),
      a: t("MODEL_PAGE.FAQ_CUTOFF_A", { name, value: cutoff }),
    });
  }

  if (meta.isModerated === true) {
    items.push({
      q: t("MODEL_PAGE.FAQ_MODERATED_Q", { name }),
      a: t("MODEL_PAGE.FAQ_MODERATED_A", { name }),
    });
  }

  items.push({
    q: t("MODEL_PAGE.FAQ_API_Q", { name }),
    a: t("MODEL_PAGE.FAQ_API_A", { ...APP_VALUES, name }),
  });

  if (items.length === 0) return null;

  return (
    <div>
      <SectionHeading
        theme={theme}
        icon={
          <Icon name="message-square" className={cn("size-4", theme.text)} />
        }
      >
        {t("MODEL_PAGE.FAQ_TITLE")}
      </SectionHeading>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => {
          const isOpen = open.includes(i);
          return (
            <div
              key={item.q}
              className="border-border/60 overflow-hidden rounded-lg border"
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                className="hover:bg-muted/30 flex w-full items-center gap-2 px-4 py-3 text-left transition-colors"
              >
                <span className="text-foreground flex-1 text-sm font-medium">
                  {item.q}
                </span>
                <Icon
                  name="chevron-down"
                  className="text-muted-foreground size-4 shrink-0 transition-transform duration-200"
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {isOpen ? (
                <p className="text-muted-foreground px-4 pb-3 text-sm leading-relaxed">
                  {item.a}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
