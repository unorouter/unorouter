"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { useDashboardQuotaQuery } from "@/hooks/dashboard-hook";
import type { ResponseArrayModelQuotaDataDataItem } from "@/openapi";
import { useTranslations } from "next-intl";
import { LuChartBar, LuRefreshCw } from "react-icons/lu";
import { useState } from "react";
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

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function buildChartConfig(modelNames: string[]): ChartConfig {
  const config: ChartConfig = {};
  modelNames.forEach((name, i) => {
    config[name] = {
      label: name,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });
  return config;
}

function processDistributionData(data: NonNullable<ResponseArrayModelQuotaDataDataItem>[]) {
  const byTime = new Map<string, Record<string, number>>();
  const models = new Set<string>();

  for (const item of data) {
    if (!item.created_at || !item.model_name) continue;
    const date = new Date(item.created_at * 1000);
    const key = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
    models.add(item.model_name);
    const existing = byTime.get(key) ?? {};
    existing[item.model_name] =
      (existing[item.model_name] ?? 0) + (item.quota ?? 0) / 500000;
    byTime.set(key, existing);
  }

  const modelList = [...models].slice(0, 5);
  const chartData = [...byTime.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, values]) => ({ time, ...values }));

  return { chartData, modelList };
}

function processTrendData(data: NonNullable<ResponseArrayModelQuotaDataDataItem>[]) {
  const byTime = new Map<string, { quota: number; count: number }>();

  for (const item of data) {
    if (!item.created_at) continue;
    const date = new Date(item.created_at * 1000);
    const key = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
    const existing = byTime.get(key) ?? { quota: 0, count: 0 };
    existing.quota += (item.quota ?? 0) / 500000;
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

function processPieData(data: NonNullable<ResponseArrayModelQuotaDataDataItem>[]) {
  const byModel = new Map<string, number>();

  for (const item of data) {
    if (!item.model_name) continue;
    byModel.set(
      item.model_name,
      (byModel.get(item.model_name) ?? 0) + (item.count ?? 0),
    );
  }

  return [...byModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
}

function processRankingData(data: NonNullable<ResponseArrayModelQuotaDataDataItem>[]) {
  const byModel = new Map<string, number>();

  for (const item of data) {
    if (!item.model_name) continue;
    byModel.set(
      item.model_name,
      (byModel.get(item.model_name) ?? 0) + (item.count ?? 0),
    );
  }

  return [...byModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

const DEFAULT_RANGE_HOURS = 24;

export function ConsumptionChart() {
  const t = useTranslations();
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    from.setHours(from.getHours() - DEFAULT_RANGE_HOURS);
    return { from, to: now };
  });

  const startTs = Math.floor(dateRange.from.getTime() / 1000);
  const endTs = Math.floor(dateRange.to.getTime() / 1000);

  const quotaQuery = useDashboardQuotaQuery(startTs, endTs);

  const rawData = ((quotaQuery.data ?? []) as ResponseArrayModelQuotaDataDataItem[]).filter(
    (item): item is NonNullable<ResponseArrayModelQuotaDataDataItem> => item != null,
  );
  const isLoading = quotaQuery.isLoading;

  const distribution = processDistributionData(rawData);
  const trendData = processTrendData(rawData);
  const pieData = processPieData(rawData);
  const rankingData = processRankingData(rawData);

  const distributionConfig = buildChartConfig(distribution.modelList);
  const trendConfig: ChartConfig = {
    quota: { label: "Quota ($)", color: "var(--color-chart-1)" },
    count: { label: "Count", color: "var(--color-chart-2)" },
  };
  const pieConfig = buildChartConfig(pieData.map((d) => d.name));
  const rankConfig: ChartConfig = {
    count: { label: "Calls", color: "var(--color-chart-1)" },
  };

  const totalQuota = rawData.reduce(
    (sum, item) => sum + (item.quota ?? 0) / 500000,
    0,
  );

  return (
    <div className="border-border bg-card flex flex-col border">
      <div className="border-border flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LuChartBar className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground font-mono text-sm font-medium">
            {t("DASHBOARD.MODEL_DATA_ANALYSIS")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DateTimeRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => quotaQuery.refetch()}
            disabled={quotaQuery.isFetching}
          >
            <LuRefreshCw
              className={`h-4 w-4 ${quotaQuery.isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-80 items-center justify-center p-5">
          <Skeleton className="h-full w-full" />
        </div>
      ) : rawData.length === 0 ? (
        <div className="flex h-80 flex-col items-center justify-center gap-2 p-5">
          <LuChartBar className="text-muted-foreground h-10 w-10 opacity-30" />
          <span className="text-muted-foreground font-mono text-xs">
            {t("DASHBOARD.NO_DATA")}
          </span>
        </div>
      ) : (
        <Tabs defaultValue="distribution" className="flex-1">
          <div className="border-border border-b px-5 pt-2">
            <TabsList variant="line" className="h-8">
              <TabsTrigger
                value="distribution"
                className="font-mono text-xs"
              >
                {t("DASHBOARD.CONSUMPTION_DISTRIBUTION")}
              </TabsTrigger>
              <TabsTrigger value="trend" className="font-mono text-xs">
                {t("DASHBOARD.CONSUMPTION_TREND")}
              </TabsTrigger>
              <TabsTrigger
                value="pie"
                className="font-mono text-xs"
              >
                {t("DASHBOARD.CALLS_DISTRIBUTION")}
              </TabsTrigger>
              <TabsTrigger
                value="ranking"
                className="font-mono text-xs"
              >
                {t("DASHBOARD.CALLS_RANKING")}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-5">
            <div className="text-muted-foreground mb-3 font-mono text-[10px] tracking-widest uppercase">
              {t("DASHBOARD.TOTAL")}: ${totalQuota.toFixed(2)}
            </div>

            <TabsContent value="distribution">
              <ChartContainer
                config={distributionConfig}
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
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {distribution.modelList.map((model, i) => (
                    <Bar
                      key={model}
                      dataKey={model}
                      stackId="a"
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="trend">
              <ChartContainer
                config={trendConfig}
                className="aspect-auto h-72 w-full"
              >
                <LineChart data={trendData}>
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
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="quota"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="pie">
              <ChartContainer
                config={pieConfig}
                className="aspect-auto h-72 w-full"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={pieData}
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
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="ranking">
              <ChartContainer
                config={rankConfig}
                className="aspect-auto h-72 w-full"
              >
                <BarChart data={rankingData} layout="vertical">
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
                    tickFormatter={(v: string) =>
                      v.length > 18 ? v.slice(0, 18) + "..." : v
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-chart-1)" />
                </BarChart>
              </ChartContainer>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
