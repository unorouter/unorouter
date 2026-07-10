"use client";

import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardData } from "@/hooks/ui/use-dashboard-data";
import { analytics } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils/format/number";
import { modelColor } from "@/lib/utils/format/color";
import {
  bucketKey,
  pickGranularity,
  type Granularity,
} from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { aggregateByModel, quotaToDollars, type QuotaDataItem } from "./stats";

function buildModelChartConfig(modelNames: string[]): ChartConfig {
  const config: ChartConfig = {};
  for (const name of modelNames) {
    config[name] = { label: name, color: modelColor(name) };
  }
  return config;
}

const DISTRIBUTION_TOP_N = 12;

function processDistributionData(
  data: QuotaDataItem[],
  g: Granularity,
  otherLabel: string,
) {
  const byTime = new Map<string, Record<string, number>>();
  const modelTotals = new Map<string, number>();

  for (const item of data) {
    if (!item.created_at || !item.model_name) continue;
    const key = bucketKey(item.created_at, g);
    const dollars = quotaToDollars(item.quota ?? 0);
    modelTotals.set(
      item.model_name,
      (modelTotals.get(item.model_name) ?? 0) + dollars,
    );
    const existing = byTime.get(key) ?? {};
    existing[item.model_name] = (existing[item.model_name] ?? 0) + dollars;
    byTime.set(key, existing);
  }

  const ranked = [...modelTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  const topModels = ranked.slice(0, DISTRIBUTION_TOP_N);
  const topSet = new Set(topModels);
  const hasOther = ranked.length > topModels.length;
  const modelList = hasOther ? [...topModels, otherLabel] : topModels;

  const chartData = [...byTime.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, values]) => {
      const row: Record<string, number | string> = { time };
      let other = 0;
      for (const [name, value] of Object.entries(values)) {
        if (topSet.has(name)) row[name] = value;
        else other += value;
      }
      if (hasOther) row[otherLabel] = other;
      return row;
    });

  return { chartData, modelList };
}

function processTrendData(data: QuotaDataItem[], g: Granularity) {
  const byTime = new Map<string, { quota: number; count: number }>();

  for (const item of data) {
    if (!item.created_at) continue;
    const key = bucketKey(item.created_at, g);
    const existing = byTime.get(key) ?? { quota: 0, count: 0 };
    existing.quota += quotaToDollars(item.quota ?? 0);
    existing.count += item.count ?? 0;
    byTime.set(key, existing);
  }

  return [...byTime.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, values]) => ({
      time,
      quota: Number(values.quota.toFixed(4)),
      count: values.count,
    }));
}

function ChartToolbar(props: { dashboard: ReturnType<typeof useDashboardData> }) {
  const t = useTranslations();
  const dashboard = props.dashboard;
  return (
    <div className="border-border flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Icon name="chart-bar" className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground font-mono text-sm font-medium">
          {t("DASHBOARD.CHART.MODEL_DATA_ANALYSIS")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <DateTimeRangePicker
          value={dashboard.dateRange}
          onChange={(range) => {
            analytics.dashboard.dateRangeChanged({
              period_minutes: dashboard.periodMinutes,
            });
            dashboard.setDateRange(range);
          }}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            analytics.dashboard.refreshed();
            dashboard.refetchAll();
          }}
          disabled={dashboard.isFetching}
        >
          <Icon
            name="refresh-cw"
            className={`h-4 w-4 ${dashboard.isFetching ? "animate-spin" : ""}`}
          />
        </Button>
        {!dashboard.isDefaultRange && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              analytics.dashboard.dateRangeReset();
              dashboard.resetDateRange();
            }}
            title={t("DASHBOARD.CHART.RESET_DATE_RANGE")}
          >
            <Icon name="rotate-ccw" className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ConsumptionChart() {
  const t = useTranslations();
  const dashboard = useDashboardData();
  const isLoading = dashboard.quotaQuery.isLoading;

  const otherLabel = t("DASHBOARD.OTHER");
  const totalLabel = t("DASHBOARD.TOTAL");
  const granularity = pickGranularity(dashboard.periodMinutes);
  const distribution = processDistributionData(
    dashboard.rawData,
    granularity,
    otherLabel,
  );
  const trendData = processTrendData(dashboard.rawData, granularity);
  const pieData = aggregateByModel(dashboard.rawData, "count", 8, otherLabel);
  const rankingData = aggregateByModel(
    dashboard.rawData,
    "count",
    20,
    otherLabel,
  ).toReversed();

  const totalQuota = dashboard.rawData.reduce(
    (sum, item) => sum + quotaToDollars(item.quota ?? 0),
    0,
  );

  return (
    <div className="border-border bg-card flex min-w-0 flex-col border">
      <ChartToolbar dashboard={dashboard} />

      {isLoading ? (
        <div className="flex h-80 items-center justify-center p-5">
          <Skeleton className="h-full w-full" />
        </div>
      ) : dashboard.rawData.length === 0 ? (
        <div className="flex h-80 flex-col items-center justify-center gap-2 p-5">
          <Icon
            name="chart-bar"
            className="text-muted-foreground h-10 w-10 opacity-30"
          />
          <span className="text-muted-foreground font-mono text-xs">
            {t("DASHBOARD.NO_DATA")}
          </span>
        </div>
      ) : (
        <Tabs
          defaultValue="distribution"
          className="flex-1"
          onValueChange={(tab) => analytics.dashboard.chartTabChanged({ tab })}
        >
          <div className="border-border overflow-hidden border-b px-5 pt-2">
            <TabsList variant="line" className="h-8">
              <TabsTrigger
                value="distribution"
                className="font-mono text-xs whitespace-nowrap"
              >
                {t("DASHBOARD.CHART.CONSUMPTION_DISTRIBUTION")}
              </TabsTrigger>
              <TabsTrigger
                value="trend"
                className="font-mono text-xs whitespace-nowrap"
              >
                {t("DASHBOARD.CHART.CONSUMPTION_TREND")}
              </TabsTrigger>
              <TabsTrigger
                value="pie"
                className="font-mono text-xs whitespace-nowrap"
              >
                {t("DASHBOARD.CHART.CALLS_DISTRIBUTION")}
              </TabsTrigger>
              <TabsTrigger
                value="ranking"
                className="font-mono text-xs whitespace-nowrap"
              >
                {t("DASHBOARD.CHART.CALLS_RANKING")}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-5">
            <div className="text-muted-foreground mb-3 font-mono text-[10px] tracking-widest uppercase">
              {t("DASHBOARD.TOTAL")}: ${totalQuota.toFixed(2)}
            </div>

            <TabsContent value="distribution">
              <DistributionChart
                distribution={distribution}
                totalLabel={totalLabel}
              />
            </TabsContent>

            <TabsContent value="trend">
              <TrendChart trendData={trendData} />
            </TabsContent>

            <TabsContent value="pie">
              <CallsPieChart pieData={pieData} />
            </TabsContent>

            <TabsContent value="ranking">
              <CallsRankingChart rankingData={rankingData} />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}

function DistributionChart(props: {
  distribution: ReturnType<typeof processDistributionData>;
  totalLabel: string;
}) {
  const distribution = props.distribution;
  return (
    <ChartContainer
      config={buildModelChartConfig(distribution.modelList)}
      className="aspect-auto h-72 w-full"
    >
      <BarChart data={distribution.chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          fontFamily="monospace"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={10}
          fontFamily="monospace"
          allowDecimals
          tickFormatter={formatPrice}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              valueFormatter={formatPrice}
              sortDesc
              showTotal
              totalLabel={props.totalLabel}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {distribution.modelList.map((model) => (
          <Bar
            key={model}
            dataKey={model}
            stackId="a"
            fill={modelColor(model)}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

function TrendChart(props: {
  trendData: ReturnType<typeof processTrendData>;
}) {
  const trendConfig: ChartConfig = {
    quota: { label: "Quota ($)", color: "var(--color-chart-1)" },
    count: { label: "Count", color: "var(--color-chart-2)" },
  };
  return (
    <ChartContainer config={trendConfig} className="aspect-auto h-72 w-full">
      <LineChart data={props.trendData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          fontFamily="monospace"
        />
        {/* Quota ($) and Count (requests) are different units; split axes so
            the tiny quota line is not flattened by the large count and Count
            is never dollar-labeled. */}
        <YAxis
          yAxisId="quota"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          fontFamily="monospace"
          allowDecimals
          tickFormatter={formatPrice}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          fontFamily="monospace"
          allowDecimals={false}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              valueFormatter={(value, name) =>
                name === "count" ? value.toLocaleString() : formatPrice(value)
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          yAxisId="quota"
          type="monotone"
          dataKey="quota"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="count"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

function CallsPieChart(props: {
  pieData: ReturnType<typeof aggregateByModel>;
}) {
  return (
    <ChartContainer
      config={buildModelChartConfig(props.pieData.map((d) => d.name))}
      className="aspect-auto h-72 w-full"
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie
          data={props.pieData}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) =>
            `${name.length > 15 ? name.slice(0, 15) + "..." : name} ${(percent * 100).toFixed(0)}%`
          }
          fontSize={10}
          fontFamily="monospace"
        >
          {props.pieData.map((entry, i) => (
            <Cell key={i} fill={modelColor(entry.name)} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}

function CallsRankingChart(props: {
  rankingData: ReturnType<typeof aggregateByModel>;
}) {
  const rankConfig: ChartConfig = {
    count: { label: "Calls", color: "var(--color-chart-1)" },
  };
  return (
    <ChartContainer config={rankConfig} className="aspect-auto h-72 w-full">
      <BarChart data={props.rankingData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          fontFamily="monospace"
        />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          fontSize={9}
          fontFamily="monospace"
          width={120}
          interval={0}
          tickFormatter={(v: string) =>
            v.length > 18 ? v.slice(0, 18) + "..." : v
          }
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count">
          {props.rankingData.map((entry, i) => (
            <Cell key={i} fill={modelColor(entry.name)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
