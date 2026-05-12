"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  RankedVendor,
  RankingPeriod,
  VendorShareSeries,
} from "@/lib/api/typebox/rankings";
import { useTranslations } from "next-intl";
import { LuChartPie } from "react-icons/lu";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { VendorLink } from "./entity-links";
import { formatShare, formatTokens } from "./format";

const VENDOR_COLOURS: Record<string, string> = {
  OpenAI: "#10a37f",
  Anthropic: "#d97757",
  Google: "#4285f4",
  DeepSeek: "#7c5cff",
  Alibaba: "#ff9900",
  xAI: "#1f2937",
  Meta: "#1877f2",
  Moonshot: "#ec4899",
  Zhipu: "#06b6d4",
  Mistral: "#ff7000",
  ByteDance: "#3b82f6",
  Tencent: "#22c55e",
  MiniMax: "#a855f7",
  Cohere: "#fb923c",
  Baidu: "#ef4444",
  Others: "#94a3b8",
};

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
    if (VENDOR_COLOURS[name]) {
      result[name] = VENDOR_COLOURS[name];
    } else {
      result[name] = FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length];
      fallbackIdx += 1;
    }
  }
  return result;
}

const MAX_VENDORS_IN_LIST = 12;

const PERIOD_KEY: Record<RankingPeriod, string> = {
  today: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.TODAY",
  week: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.WEEK",
  month: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.MONTH",
  year: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.YEAR",
  all: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.ALL",
};

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

  const chartData = buildChartData(props.history.points, vendorNames);

  const visible = props.rows.slice(0, MAX_VENDORS_IN_LIST);
  const half = Math.ceil(visible.length / 2);
  const left = visible.slice(0, half);
  const right = visible.slice(half);

  return (
    <section className="bg-card overflow-hidden rounded-lg border">
      <header className="px-5 py-4">
        <h2 className="text-foreground inline-flex items-center gap-2 text-base font-semibold">
          <LuChartPie className="text-primary size-4" />
          {t("RANKINGS.VENDORS.TITLE")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- PERIOD_KEY values are valid translation keys but inferred as `string` from the record type */}
          {t(PERIOD_KEY[props.period] as any)}
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
            <div className="text-muted-foreground/80 flex h-full items-center justify-center text-xs">
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
          <p className="text-muted-foreground/80 mt-0.5 text-xs">
            {t("RANKINGS.VENDORS.LIST_SUBTITLE")}
          </p>
        </header>
        {visible.length === 0 ? (
          <div className="text-muted-foreground/80 px-5 py-8 text-center text-sm">
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
  return (
    <ul>
      {props.rows.map((vendor) => (
        <li key={vendor.vendor} className="flex items-center gap-3 py-2.5">
          <span className="text-muted-foreground/80 w-6 shrink-0 text-right font-mono text-xs tabular-nums">
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
              {formatTokens(vendor.total_tokens)}
            </div>
            <div className="text-muted-foreground/80 font-mono text-[11px] tabular-nums">
              {formatShare(vendor.share)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function buildChartData(
  points: VendorShareSeries["points"],
  vendorNames: string[],
): Array<Record<string, number | string>> {
  const byLabel = new Map<string, Record<string, number>>();
  const orderByLabel = new Map<string, string>();

  for (const p of points) {
    const bucket = byLabel.get(p.label) ?? {};
    bucket[p.vendor] = (bucket[p.vendor] ?? 0) + p.share;
    byLabel.set(p.label, bucket);
    if (!orderByLabel.has(p.label)) orderByLabel.set(p.label, p.ts);
  }

  const labelsSorted = [...byLabel.keys()].sort((a, b) => {
    const ta = String(orderByLabel.get(a) ?? a);
    const tb = String(orderByLabel.get(b) ?? b);
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return 0;
  });

  return labelsSorted.map((label) => {
    const row: Record<string, number | string> = { label };
    const bucket = byLabel.get(label) ?? {};
    for (const name of vendorNames) {
      row[name] = bucket[name] ?? 0;
    }
    return row;
  });
}
