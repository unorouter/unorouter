"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  ModelHistorySeries,
  RankedModel,
  RankingPeriod,
} from "@/lib/api/typebox/rankings";
import { modelColor } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { LuChartColumn, LuTrophy } from "react-icons/lu";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatTokens } from "./format";
import { ModelLeaderboard } from "./model-leaderboard";

type ModelsSectionProps = {
  history: ModelHistorySeries;
  rows: RankedModel[];
  period: RankingPeriod;
};

const PERIOD_KEY: Record<RankingPeriod, string> = {
  today: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.TODAY",
  week: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.WEEK",
  month: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.MONTH",
  year: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.YEAR",
  all: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.ALL",
};

export function ModelsSection(props: ModelsSectionProps) {
  const t = useTranslations();

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

  const chartData = buildChartData(props.history.points, modelNames);

  return (
    <section className="bg-card overflow-hidden rounded-lg border">
      <header className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-foreground inline-flex items-center gap-2 text-base font-semibold">
            <LuChartColumn className="text-primary size-4" />
            {t("RANKINGS.MODELS.TITLE")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- PERIOD_KEY values are valid translation keys but inferred as `string` from the record type */}
            {t(PERIOD_KEY[props.period] as any)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-foreground font-mono text-2xl font-semibold tabular-nums">
            {formatTokens(totalTokens)}
          </div>
          <div className="text-muted-foreground/80 text-[10px] font-medium tracking-widest uppercase">
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
                  tickFormatter={(v: number) => formatTokens(v)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      valueFormatter={formatTokens}
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
            <div className="text-muted-foreground/80 flex h-full items-center justify-center text-xs">
              {t("RANKINGS.ERROR.NO_HISTORY")}
            </div>
          )}
        </div>
      </div>

      <div className="border-t">
        <header className="px-5 pt-4 pb-2">
          <h3 className="text-foreground inline-flex items-center gap-2 text-sm font-semibold">
            <LuTrophy className="size-3.5 text-amber-500" />
            {t("RANKINGS.MODELS.LEADERBOARD_TITLE")}
          </h3>
          <p className="text-muted-foreground/80 mt-0.5 text-xs">
            {t("RANKINGS.MODELS.LEADERBOARD_SUBTITLE")}
          </p>
        </header>
        {props.rows.length === 0 ? (
          <div className="text-muted-foreground/80 px-5 py-8 text-center text-sm">
            {t("RANKINGS.MODELS.EMPTY")}
          </div>
        ) : (
          <div className="px-5 pt-1 pb-4">
            <ModelLeaderboard rows={props.rows} />
          </div>
        )}
      </div>
    </section>
  );
}

function buildChartData(
  points: ModelHistorySeries["points"],
  modelNames: string[],
): Array<Record<string, number | string>> {
  const byLabel = new Map<string, Record<string, number>>();
  const orderByLabel = new Map<string, string>();

  for (const p of points) {
    const bucket = byLabel.get(p.label) ?? {};
    bucket[p.model] = (bucket[p.model] ?? 0) + p.tokens;
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
    for (const name of modelNames) {
      row[name] = bucket[name] ?? 0;
    }
    return row;
  });
}
