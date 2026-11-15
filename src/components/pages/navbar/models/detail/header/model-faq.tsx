"use client";

import type { PricingCatalogDetail } from "@/openapi";

import { Icon } from "@/components/ui/icon";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { SectionHeading } from "../shared/section-heading";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { modelFaqItems } from "./model-faq-items";
import { useState } from "react";

export function ModelFaq(props: {
  model: PricingCatalogDetail;
  hasFreeTwin: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const m = props.model;
  const theme = getVendorTheme(m.vendor);
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) =>
    setOpen((cur) =>
      cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i],
    );
  const items = modelFaqItems(t, m, props.hasFreeTwin, locale);

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
