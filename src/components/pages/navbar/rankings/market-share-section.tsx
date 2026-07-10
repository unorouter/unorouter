"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Icon } from "@/components/ui/icon";
import type {
  RankedVendor,
  RankingPeriod,
  VendorShareSeries,
} from "@/lib/api/typebox/rankings";
import { DEFAULT_THEME, getVendorTheme } from "@/lib/config/vendor-themes";
import { formatShare, formatTokens } from "@/lib/utils/format/number";
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { VendorLink } from "./entity-links";
import {
  periodDescriptionKey,
  pivotSeries,
  splitHalf,
} from "./rankings-helpers";

const FALLBACK_PALETTE = [
  "#0ea5e9",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#14b8a6",
  "#eab308",
  "#ec4899",
  "#84cc16",
  "#6366f1",
  "#10b981",
  "#f43f5e",
  "#0891b2",
  "#94a3b8",
];

function buildVendorColourMap(names: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  let fallbackIdx = 0;
  for (const name of names) {
    const theme = getVendorTheme(name);
    if (theme !== DEFAULT_THEME && theme.primary) {
      result[name] = theme.primary;
    } else {
      result[name] = FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length];
      fallbackIdx += 1;
    }
  }
  return result;
}

const MAX_VENDORS_IN_LIST = 12;

type MarketShareSectionProps = {
  history: VendorShareSeries;
  rows: RankedVendor[];
  period: RankingPeriod;
};

export function MarketShareSection(props: MarketShareSectionProps) {
  const t = useTranslations();

  const vendorNames = props.history.vendors.map((v) => v.name);
  const colourMap = buildVendorColourMap(vendorNames);

  const chartConfig: ChartConfig = {};
  for (const name of vendorNames) {
    chartConfig[name] = {
      label: name,
      color: colourMap[name],
    };
  }

  const chartData = pivotSeries(
    props.history.points.map((p) => ({
      label: p.label,
      ts: p.ts,
      key: p.vendor,
      value: p.share,
    })),
    vendorNames,
  );

  const visible = props.rows.slice(0, MAX_VENDORS_IN_LIST);
  const [left, right] = splitHalf(visible);

  return (
    <section className="bg-card overflow-hidden rounded-lg border">
      <header className="px-5 py-4">
        <h2 className="text-foreground inline-flex items-center gap-2 text-base font-semibold">
          <Icon name="chart-pie" className="text-primary size-4" />
          {t("RANKINGS.VENDORS.TITLE")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t(periodDescriptionKey("vendors", props.period))}
        </p>
      </header>

      <div className="px-5 pb-5">
        <div className="h-60 sm:h-72">
          {chartData.length > 0 && vendorNames.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-full w-full"
            >
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  fontFamily="monospace"
                  minTickGap={24}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  fontFamily="monospace"
                  domain={[0, 1]}
                  tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      valueFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                      sortDesc
                    />
                  }
                />
                {vendorNames.map((name) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="a"
                    fill={colourMap[name]}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
              {t("RANKINGS.ERROR.NO_HISTORY")}
            </div>
          )}
        </div>
      </div>

      <div className="border-t">
        <header className="px-5 pt-4 pb-2">
          <h3 className="text-foreground text-sm font-semibold">
            {t("RANKINGS.VENDORS.LIST_TITLE")}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("RANKINGS.VENDORS.LIST_SUBTITLE")}
          </p>
        </header>
        {visible.length === 0 ? (
          <div className="text-muted-foreground px-5 py-8 text-center text-sm">
            {t("RANKINGS.VENDORS.EMPTY")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 px-5 pt-1 pb-4 md:grid-cols-2">
            <VendorList rows={left} colourMap={colourMap} />
            {right.length > 0 && (
              <VendorList rows={right} colourMap={colourMap} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function VendorList(props: {
  rows: RankedVendor[];
  colourMap: Record<string, string>;
}) {
  const locale = useLocale();
  return (
    <ul>
      {props.rows.map((vendor) => (
        <li key={vendor.vendor} className="flex items-center gap-3 py-2.5">
          <span className="text-muted-foreground w-6 shrink-0 text-right font-mono text-xs tabular-nums">
            {vendor.rank}.
          </span>
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: props.colourMap[vendor.vendor] ?? "#94a3b8",
            }}
          />
          <VendorLink
            vendor={vendor.vendor}
            className="text-foreground min-w-0 flex-1 truncate text-sm font-medium"
          >
            {vendor.vendor}
          </VendorLink>
          <div className="shrink-0 text-right">
            <div className="text-foreground font-mono text-sm font-semibold tabular-nums">
              {formatTokens(vendor.total_tokens, locale)}
            </div>
            <div className="text-muted-foreground font-mono text-[11px] tabular-nums">
              {formatShare(vendor.share)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
