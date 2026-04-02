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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardData } from "@/hooks/ui/use-dashboard-data";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { LuChartBar, LuRefreshCw, LuRotateCcw } from "react-icons/lu";
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
import { formatPrice } from "@/lib/utils/base";
import { aggregateByModel, quotaToDollars, type QuotaDataItem } from "./stats";

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

function processDistributionData(data: QuotaDataItem[]) {
  const byTime = new Map<string, Record<string, number>>();
  const models = new Set<string>();

  for (const item of data) {
    if (!item.created_at || !item.model_name) continue;
    const key = dayjs.unix(item.created_at).format("MM/DD HH:00");
    models.add(item.model_name);
    const existing = byTime.get(key) ?? {};
    existing[item.model_name] =
      (existing[item.model_name] ?? 0) + quotaToDollars(item.quota ?? 0);
    byTime.set(key, existing);
  }

  const modelList = [...models].slice(0, 5);
  const chartData = [...byTime.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, values]) => ({ time, ...values }));

  return { chartData, modelList };
}

function processTrendData(data: QuotaDataItem[]) {
  const byTime = new Map<string, { quota: number; count: number }>();

  for (const item of data) {
    if (!item.created_at) continue;
    const key = dayjs.unix(item.created_at).format("MM/DD");
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

export function ConsumptionChart() {
  const t = useTranslations();
  const dashboard = useDashboardData();
  const isLoading = dashboard.quotaQuery.isLoading;

  const distribution = processDistributionData(dashboard.rawData);
  const trendData = processTrendData(dashboard.rawData);
  const pieData = aggregateByModel(dashboard.rawData, "count", 8);
  const rankingData = aggregateByModel(dashboard.rawData, "count", 10);

  const distributionConfig = buildChartConfig(distribution.modelList);
  const trendConfig: ChartConfig = {
    quota: { label: "Quota ($)", color: "var(--color-chart-1)" },
    count: { label: "Count", color: "var(--color-chart-2)" },
  };
  const pieConfig = buildChartConfig(pieData.map((d) => d.name));
  const rankConfig: ChartConfig = {
    count: { label: "Calls", color: "var(--color-chart-1)" },
  };

  const totalQuota = dashboard.rawData.reduce(
    (sum, item) => sum + quotaToDollars(item.quota ?? 0),
    0,
  );

  return (
    <div className="border-border bg-card flex min-w-0 flex-col overflow-hidden border">
      <div className="border-border flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LuChartBar className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground font-mono text-sm font-medium">
            {t("DASHBOARD.MODEL_DATA_ANALYSIS")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DateTimeRangePicker
            value={dashboard.dateRange}
            onChange={dashboard.setDateRange}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={dashboard.refetchAll}
            disabled={dashboard.isFetching}
          >
            <LuRefreshCw
              className={`h-4 w-4 ${dashboard.isFetching ? "animate-spin" : ""}`}
            />
          </Button>
          {!dashboard.isDefaultRange && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={dashboard.resetDateRange}
              title={t("DASHBOARD.RESET_DATE_RANGE")}
            >
              <LuRotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-80 items-center justify-center p-5">
          <Skeleton className="h-full w-full" />
        </div>
      ) : dashboard.rawData.length === 0 ? (
        <div className="flex h-80 flex-col items-center justify-center gap-2 p-5">
          <LuChartBar className="text-muted-foreground h-10 w-10 opacity-30" />
          <span className="text-muted-foreground font-mono text-xs">
            {t("DASHBOARD.NO_DATA")}
          </span>
        </div>
      ) : (
        <Tabs defaultValue="distribution" className="flex-1">
          <div className="border-border overflow-hidden border-b px-5 pt-2">
            <TabsList variant="line" className="h-8">
              <TabsTrigger
                value="distribution"
                className="font-mono text-xs whitespace-nowrap"
              >
                {t("DASHBOARD.CONSUMPTION_DISTRIBUTION")}
              </TabsTrigger>
              <TabsTrigger
                value="trend"
                className="font-mono text-xs whitespace-nowrap"
              >
                {t("DASHBOARD.CONSUMPTION_TREND")}
              </TabsTrigger>
              <TabsTrigger
                value="pie"
                className="font-mono text-xs whitespace-nowrap"
              >
                {t("DASHBOARD.CALLS_DISTRIBUTION")}
              </TabsTrigger>
              <TabsTrigger
                value="ranking"
                className="font-mono text-xs whitespace-nowrap"
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
                    allowDecimals
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent valueFormatter={formatPrice} />
                    }
                  />
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
                    allowDecimals
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent valueFormatter={formatPrice} />
                    }
                  />
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
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                  />
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
