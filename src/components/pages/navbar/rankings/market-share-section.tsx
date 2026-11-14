"use client";

import { RankingHistoryChart } from "./history-chart";
import { Icon } from "@/components/ui/icon";
import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import type { RankedVendor, VendorShareSeries } from "@/openapi";
import { DEFAULT_THEME, getVendorTheme } from "@/lib/config/vendor-registry";
import { formatShare, formatTokens } from "@/lib/utils/format/number";
import { useLocale, useTranslations } from "next-intl";
import { VendorLink } from "./entity-links";
import { periodDescriptionKey, splitHalf } from "./rankings-helpers";

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

      <RankingHistoryChart
        points={props.history.points.map((p) => ({
          label: p.label,
          ts: p.ts,
          key: p.vendor,
          value: p.share,
        }))}
        names={vendorNames}
        colorOf={(name) => colourMap[name]}
        domain={[0, 1]}
        tickFormatter={(v) => `${Math.round(v * 100)}%`}
        valueFormatter={(v) => `${(v * 100).toFixed(1)}%`}
      />

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
