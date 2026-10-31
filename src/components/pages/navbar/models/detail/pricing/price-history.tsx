"use client";

import type { PricingCatalogDetail } from "@/openapi";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Icon } from "@/components/ui/icon";
import { usePriceHistoryQuery } from "@/hooks/models/price-history-hook";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { formatUtcDay } from "@/lib/utils/format/date";
import { formatPriceCompact, QUOTA_TO_USD } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_ACCENT,
  CHART_AXIS_TICK,
  CHART_MARGIN,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "../shared/chart-primitives";

type Theme = ReturnType<typeof getVendorTheme>;

// The cheapest lane that billed real traffic in the last week, kept after the
// lane went offline or was removed, plus the daily low it came from.
export function PriceHistory(props: {
  model: PricingCatalogDetail;
  theme: Theme;
}) {
  const t = useTranslations();
  const query = usePriceHistoryQuery(props.model.model_name);
  const best = query.data?.best;
  if (!best) return null;

  const live = props.model.enable_groups.includes(best.group);
  const input = best.ratio * QUOTA_TO_USD;
  const output = input * best.completion_ratio;
  const points = (query.data?.days ?? []).map((d) => ({
    label: formatUtcDay(d.day),
    price: d.ratio * QUOTA_TO_USD,
  }));

  return (
    <div className="mt-6 overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
        <Icon
          name="trending-down"
          className={cn("h-3.5 w-3.5", props.theme.text)}
        />
        <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
          {t("MODEL_PAGE.PRICE_LOW_TITLE")}
        </span>
        <span className={cn("font-mono text-xs", props.theme.text)}>
          {t("MODEL_PAGE.PRICE_LOW_VALUE", {
            input: formatPriceCompact(input),
            output: formatPriceCompact(output),
          })}
        </span>
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase",
            live
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {live
            ? t("MODEL_PAGE.PRICE_LOW_LIVE")
            : t("MODEL_PAGE.PRICE_LOW_OFFLINE")}
        </span>
      </div>
      <div className="text-muted-foreground border-border/60 flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2 font-mono text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          {best.group}
          <CopyButton text={best.group} iconSize="h-3 w-3" />
        </span>
        <span>
          {t("MODEL_PAGE.PRICE_LOW_SEEN", {
            day: formatUtcDay(best.day),
          })}
        </span>
      </div>
      {points.length > 1 && (
        <div className="border-border/60 h-28 border-t px-2 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={CHART_MARGIN}>
              <XAxis
                dataKey="label"
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => formatPriceCompact(v)}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                formatter={(v) => [
                  formatPriceCompact(Number(v)),
                  t("MODEL_PAGE.PRICE_LOW_CHART"),
                ]}
              />
              <Line
                type="stepAfter"
                dataKey="price"
                stroke={CHART_ACCENT}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
