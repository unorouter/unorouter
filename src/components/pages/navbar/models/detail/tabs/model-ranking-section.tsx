"use client";

import { useModelRankingQuery } from "@/hooks/models/model-ranking-hook";
import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";
import { formatTokenCount } from "@/lib/utils/format/number";
import { RANKING_PERIODS } from "@/components/pages/navbar/rankings/rankings-helpers";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  modelName: string;
  vendorName: string;
};

export function ModelRankingSection(props: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [period, setPeriod] = useState<RankingPeriod>("week");
  const query = useModelRankingQuery(props.modelName, period);
  const theme = getVendorTheme(props.vendorName);
  const data = query.data;
  const series = data?.series ?? [];
  const growth = data?.growth_pct ?? 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          className={cn(
            "font-mono text-[10px] tracking-widest uppercase",
            theme.text,
          )}
        >
          {t("MODEL_PAGE.USAGE_TITLE")}
        </h2>
        <div
          role="tablist"
          className="border-border/60 flex items-center gap-1"
        >
          {RANKING_PERIODS.map((p) => {
            const isActive = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "rounded-sm px-2 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(p.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {query.isLoading ? (
        <div className="text-muted-foreground border-border rounded-md border p-4 text-center text-sm">
          {t("MODEL_PAGE.USAGE_LOADING")}
        </div>
      ) : series.length === 0 ? (
        <div className="text-muted-foreground border-border rounded-md border p-4 text-center text-sm">
          {t("MODEL_PAGE.USAGE_EMPTY")}
        </div>
      ) : (
        <div className="border-border rounded-md border p-3">
          <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="font-mono text-sm">
              {data && data.rank > 0
                ? t("MODEL_PAGE.USAGE_RANKED", { rank: data.rank })
                : t("MODEL_PAGE.USAGE_UNRANKED")}
            </span>
            <span className="text-muted-foreground font-mono text-xs">
              {formatTokenCount(data?.total_tokens ?? 0, locale)}{" "}
              {t("MODEL_PAGE.USAGE_TOKENS_LABEL")}
            </span>
            {growth !== 0 && (
              <span
                className={cn(
                  "rounded px-1 font-mono text-xs",
                  growth > 0
                    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                    : "bg-red-500/15 text-red-600 dark:text-red-400",
                )}
              >
                {growth > 0 ? "+" : ""}
                {growth.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 5, right: 8, bottom: 0, left: -8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  minTickGap={16}
                />
                <YAxis
                  width={44}
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                  tickFormatter={(value: number) =>
                    formatTokenCount(value, locale)
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--popover-foreground)",
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                  formatter={(value: number) => [
                    formatTokenCount(value, locale),
                    t("MODEL_PAGE.USAGE_TOKENS_LABEL"),
                  ]}
                />
                <Bar
                  dataKey="tokens"
                  fill="var(--color-chart-1)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
