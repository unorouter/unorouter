"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { usePriceDropsQuery } from "@/hooks/models/price-history-hook";
import { formatUtcDay } from "@/lib/utils/format/date";
import { formatPriceCompact, QUOTA_TO_USD } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ModelLink } from "./entity-links";

const COLLAPSED_ROWS = 10;

export function PriceDropsSection() {
  const t = useTranslations();
  const query = usePriceDropsQuery();
  const [expanded, setExpanded] = useState(false);
  const drops = query.data?.drops ?? [];
  const shown = expanded ? drops : drops.slice(0, COLLAPSED_ROWS);

  return (
    <section className="bg-card overflow-hidden rounded-lg border">
      <header className="border-b px-4 py-3">
        <h3 className="text-foreground inline-flex items-center gap-2 text-sm font-semibold">
          <Icon name="trending-down" className="size-4 text-emerald-500" />
          {t("RANKINGS.PRICE_DROPS.TITLE")}
        </h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t("RANKINGS.PRICE_DROPS.SUBTITLE")}
        </p>
      </header>
      {drops.length === 0 ? (
        <div className="text-muted-foreground px-4 py-6 text-center text-xs">
          {query.isLoading
            ? t("RANKINGS.PRICE_DROPS.LOADING")
            : t("RANKINGS.PRICE_DROPS.EMPTY")}
        </div>
      ) : (
        <ul className="py-1">
          {shown.map((row) => (
            <li
              key={`${row.model_name}|${row.day}`}
              className="flex items-center gap-3 px-4 py-2"
            >
              <span className="shrink-0">
                <VendorIcon vendor={row.vendor} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <ModelLink
                  modelName={row.model_name}
                  vendor={row.vendor}
                  className="text-foreground block truncate font-mono text-xs font-medium"
                >
                  {row.model_name}
                </ModelLink>
                <p className="text-muted-foreground truncate font-mono text-[11px]">
                  {formatUtcDay(row.day)}
                  {" / "}
                  {row.group}
                </p>
              </div>
              <div className="shrink-0 text-right font-mono text-[11px] tabular-nums">
                <div className="text-muted-foreground">
                  <span className="line-through">
                    {formatPriceCompact(row.previous_ratio * QUOTA_TO_USD)}
                  </span>{" "}
                  <span className="text-foreground">
                    {formatPriceCompact(row.ratio * QUOTA_TO_USD)}
                  </span>
                </div>
                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {t("RANKINGS.PRICE_DROPS.PCT", {
                    pct: Math.round(row.drop_pct),
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {drops.length > COLLAPSED_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground w-full border-t px-4 py-2 font-mono text-[11px] tracking-wider uppercase transition-colors"
        >
          {expanded
            ? t("RANKINGS.PRICE_DROPS.SHOW_LESS")
            : t("RANKINGS.PRICE_DROPS.SHOW_ALL", { count: drops.length })}
        </button>
      )}
    </section>
  );
}
