"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { pivotSeries, type PivotPoint } from "./rankings-helpers";

export function RankingHistoryChart(props: {
  points: readonly PivotPoint[];
  names: readonly string[];
  colorOf: (name: string) => string;
  tickFormatter: (v: number) => string;
  valueFormatter: (v: number) => string;
  domain?: [number, number];
  totalLabel?: string;
}) {
  const t = useTranslations();
  const chartConfig: ChartConfig = Object.fromEntries(
    props.names.map((name) => [
      name,
      { label: name, color: props.colorOf(name) },
    ]),
  );
  const chartData = pivotSeries(props.points, props.names);

  return (
    <div className="px-5 pb-5">
      <div className="h-60 sm:h-72">
        {chartData.length > 0 && props.names.length > 0 ? (
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
                domain={props.domain}
                tickFormatter={props.tickFormatter}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    valueFormatter={props.valueFormatter}
                    sortDesc
                    showTotal={props.totalLabel !== undefined}
                    totalLabel={props.totalLabel}
                  />
                }
              />
              {props.names.map((name) => (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId="a"
                  fill={props.colorOf(name)}
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
  );
}
