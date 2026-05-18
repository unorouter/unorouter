"use client";

import { Icon } from "@/components/ui/icon";
import { useStatusQuery } from "@/hooks/status-hook";
import { analytics } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function FaqPanel() {
  const t = useTranslations();
  const statusQuery = useStatusQuery();
  const status = statusQuery.data;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!status?.faq_enabled) return null;

  const faqItems = status?.faq ?? [];

  return (
    <div className="border-border bg-card flex flex-col border">
      <div className="border-border flex items-center gap-2 border-b p-5">
        <Icon name="circle-help" className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground font-mono text-sm font-medium">
          {t("DASHBOARD.PANEL.FAQ")}
        </span>
      </div>

      <div className="max-h-64 flex-1 overflow-y-auto">
        {faqItems.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <Icon
              name="circle-help"
              className="text-muted-foreground h-8 w-8 opacity-20"
            />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("DASHBOARD.PANEL.NO_FAQ")}
            </span>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {faqItems.map((item, i) => (
              <div key={i}>
                <button
                  className="hover:bg-accent/50 flex w-full items-center gap-2 p-4 text-left transition-colors"
                  onClick={() => {
                    const next = openIndex === i ? null : i;
                    if (next !== null) {
                      analytics.dashboard.faqExpanded({ index: i });
                    }
                    setOpenIndex(next);
                  }}
                >
                  <span className="text-foreground flex-1 font-mono text-xs font-medium">
                    {item.question}
                  </span>
                  <Icon
                    name="chevron-down"
                    className="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                    style={{
                      transform:
                        openIndex === i ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>
                {openIndex === i && item.answer && (
                  <div className="bg-muted/30 px-4 pt-0 pb-4">
                    <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
