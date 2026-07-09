"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Icon } from "@/components/ui/icon";
import type {
  ModelHistorySeries,
  RankedModel,
  RankingPeriod,
} from "@/lib/api/typebox/rankings";
import { formatTokens } from "@/lib/utils/format/number";
import { modelColor } from "@/lib/utils/format/color";
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ModelLeaderboard } from "./model-leaderboard";
import { periodDescriptionKey, pivotSeries } from "./rankings-helpers";

type ModelsSectionProps = {
  history: ModelHistorySeries;
  rows: RankedModel[];
  period: RankingPeriod;
};

export function ModelsSection(props: ModelsSectionProps) {
  const t = useTranslations();
  const locale = useLocale();
  const fmtTokens = (v: number) => formatTokens(v, locale);

  const totalTokens = props.rows.reduce((s, r) => s + r.total_tokens, 0);

  const orderedModels = props.history.models;
  const modelNames = orderedModels.map((m) => m.name);

  const chartConfig: ChartConfig = {};
  for (const m of orderedModels) {
    chartConfig[m.name] = {
      label: m.name,
      color: modelColor(m.name),
    };
  }

  const chartData = pivotSeries(
    props.history.points.map((p) => ({
      label: p.label,
      ts: p.ts,
      key: p.model,
      value: p.tokens,
    })),
    modelNames,
  );

  return (
    <section className="bg-card overflow-hidden rounded-lg border">
      <header className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-foreground inline-flex items-center gap-2 text-base font-semibold">
            <Icon name="chart-column" className="text-primary size-4" />
            {t("RANKINGS.MODELS.TITLE")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t(periodDescriptionKey("models", props.period))}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-foreground font-mono text-2xl font-semibold tabular-nums">
            {fmtTokens(totalTokens)}
          </div>
          <div className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
            {t("RANKINGS.MODELS.TOKENS_SUFFIX")}
          </div>
        </div>
      </header>

      <div className="px-5 pb-5">
        <div className="h-60 sm:h-72">
          {chartData.length > 0 && modelNames.length > 0 ? (
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
                  tickFormatter={fmtTokens}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      valueFormatter={fmtTokens}
                      sortDesc
                      showTotal
                      totalLabel={t("RANKINGS.MODELS.TOOLTIP_TOTAL")}
                    />
                  }
                />
                {modelNames.map((name) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="a"
                    fill={modelColor(name)}
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
          <h3 className="text-foreground inline-flex items-center gap-2 text-sm font-semibold">
            <Icon name="trophy" className="size-3.5 text-amber-500" />
            {t("RANKINGS.MODELS.LEADERBOARD_TITLE")}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("RANKINGS.MODELS.LEADERBOARD_SUBTITLE")}
          </p>
        </header>
        {props.rows.length === 0 ? (
          <div className="text-muted-foreground px-5 py-8 text-center text-sm">
            {t("RANKINGS.MODELS.EMPTY")}
          </div>
        ) : (
          <div className="px-5 pt-1 pb-4">
            <ModelLeaderboard rows={props.rows} limit={20} />
          </div>
        )}
      </div>
    </section>
  );
}
