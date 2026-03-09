"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useDashboardQuotaQuery } from "@/hooks/dashboard-hook";
import type { ResponseArrayModelQuotaDataDataItem } from "@/openapi";
import { dashboardDateRangeAtom } from "@/store/dashboard";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import {
  LuActivity,
  LuBinary,
  LuDollarSign,
  LuGauge,
  LuHash,
  LuSend,
  LuTrendingDown,
  LuWallet,
} from "react-icons/lu";
import { Line, LineChart, ResponsiveContainer } from "recharts";

function renderQuota(quota: number | undefined): string {
  if (quota === undefined || quota === null) return "$0.00";
  return `$${(quota / 500000).toFixed(2)}`;
}

function Sparkline(props: { data: number[]; color: string }) {
  if (props.data.length < 2) return null;
  const chartData = props.data.map((y, i) => ({ x: i, y }));
  return (
    <div className="h-10 w-24 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="y"
            stroke={props.color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type StatItemProps = {
  label: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  isLoading: boolean;
  accentColor: string;
  trendData?: number[];
  trendColor?: string;
};

function StatItem(props: StatItemProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center"
        style={{ color: props.accentColor }}
      >
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground block font-mono text-[10px] tracking-widest uppercase">
          {props.label}
        </span>
        {props.isLoading ? (
          <Skeleton className="mt-1 h-5 w-20" />
        ) : (
          <span className="text-foreground block text-lg font-bold tracking-tight tabular-nums">
            {typeof props.value === "number"
              ? props.value.toLocaleString()
              : (props.value ?? "\u2014")}
          </span>
        )}
      </div>
      {!props.isLoading && props.trendData && props.trendColor && (
        <Sparkline data={props.trendData} color={props.trendColor} />
      )}
    </div>
  );
}

type StatsCardProps = {
  title: string;
  items: StatItemProps[];
};

function StatsCard(props: StatsCardProps) {
  return (
    <div className="flex flex-col p-5">
      <span className="text-muted-foreground mb-1 font-mono text-[10px] font-medium tracking-widest uppercase">
        {props.title}
      </span>
      <div className="divide-border divide-y">
        {props.items.map((item, i) => (
          <StatItem key={i} {...item} />
        ))}
      </div>
    </div>
  );
}

type BucketData = {
  count: number;
  quota: number;
  tokenUsed: number;
};

function processQuotaData(
  data: NonNullable<ResponseArrayModelQuotaDataDataItem>[],
  periodMinutes: number,
) {
  let totalCount = 0;
  let totalQuota = 0;
  let totalTokens = 0;
  const byHour = new Map<number, BucketData>();

  for (const item of data) {
    if (!item) continue;
    totalCount += item.count ?? 0;
    totalQuota += item.quota ?? 0;
    totalTokens += item.token_used ?? 0;

    const hourKey = item.created_at ?? 0;
    const existing = byHour.get(hourKey);
    if (existing) {
      existing.count += item.count ?? 0;
      existing.quota += item.quota ?? 0;
      existing.tokenUsed += item.token_used ?? 0;
    } else {
      byHour.set(hourKey, {
        count: item.count ?? 0,
        quota: item.quota ?? 0,
        tokenUsed: item.token_used ?? 0,
      });
    }
  }

  const sortedKeys = [...byHour.keys()].sort((a, b) => a - b);
  const buckets = sortedKeys.map((k) => byHour.get(k)!);

  const intervalMinutes =
    sortedKeys.length >= 2
      ? (sortedKeys[sortedKeys.length - 1] - sortedKeys[0]) /
        60 /
        Math.max(sortedKeys.length - 1, 1)
      : 60;

  const countTrend = buckets.map((b) => b.count);
  const quotaTrend = buckets.map((b) => b.quota);
  const tokenTrend = buckets.map((b) => b.tokenUsed);
  const rpmTrend = buckets.map((b) =>
    intervalMinutes > 0 ? b.count / intervalMinutes : 0,
  );
  const tpmTrend = buckets.map((b) =>
    intervalMinutes > 0 ? b.tokenUsed / intervalMinutes : 0,
  );

  const avgRpm = periodMinutes > 0 ? totalCount / periodMinutes : 0;
  const avgTpm = periodMinutes > 0 ? totalTokens / periodMinutes : 0;

  return {
    totalCount,
    totalQuota,
    totalTokens,
    avgRpm,
    avgTpm,
    trends: {
      count: countTrend,
      quota: quotaTrend,
      tokens: tokenTrend,
      rpm: rpmTrend,
      tpm: tpmTrend,
    },
  };
}

export function StatsCards() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const dateRange = useAtomValue(dashboardDateRangeAtom);

  const startTs = Math.floor(dateRange.from.getTime() / 1000);
  const endTs = Math.floor(dateRange.to.getTime() / 1000);
  const periodMinutes = (endTs - startTs) / 60;

  const quotaQuery = useDashboardQuotaQuery(startTs, endTs);

  const user = authQuery.data as
    | {
        quota?: number;
        used_quota?: number;
        request_count?: number;
      }
    | undefined;

  const rawData = (
    (quotaQuery.data ?? []) as ResponseArrayModelQuotaDataDataItem[]
  ).filter(
    (item): item is NonNullable<ResponseArrayModelQuotaDataDataItem> =>
      item != null,
  );

  const stats = processQuotaData(rawData, periodMinutes);
  const isLoading = authQuery.isLoading || quotaQuery.isLoading;

  const cards: StatsCardProps[] = [
    {
      title: t("DASHBOARD.ACCOUNT_DATA"),
      items: [
        {
          label: t("DASHBOARD.CURRENT_BALANCE"),
          value: renderQuota(user?.quota),
          icon: <LuWallet className="h-4 w-4" />,
          isLoading: authQuery.isLoading,
          accentColor: "var(--chart-2)",
        },
        {
          label: t("DASHBOARD.CONSUMPTION"),
          value: renderQuota(user?.used_quota),
          icon: <LuTrendingDown className="h-4 w-4" />,
          isLoading: authQuery.isLoading,
          accentColor: "var(--chart-3)",
        },
      ],
    },
    {
      title: t("DASHBOARD.USAGE_STATISTICS"),
      items: [
        {
          label: t("DASHBOARD.REQUEST_COUNT"),
          value: user?.request_count,
          icon: <LuSend className="h-4 w-4" />,
          isLoading: authQuery.isLoading,
          accentColor: "var(--chart-1)",
        },
        {
          label: t("DASHBOARD.STATISTICAL_COUNT"),
          value: stats.totalCount,
          icon: <LuHash className="h-4 w-4" />,
          isLoading: quotaQuery.isLoading,
          accentColor: "var(--chart-4)",
          trendData: stats.trends.count,
          trendColor: "#06b6d4",
        },
      ],
    },
    {
      title: t("DASHBOARD.RESOURCE_CONSUMPTION"),
      items: [
        {
          label: t("DASHBOARD.STATISTICAL_QUOTA"),
          value: renderQuota(stats.totalQuota),
          icon: <LuDollarSign className="h-4 w-4" />,
          isLoading: quotaQuery.isLoading,
          accentColor: "var(--chart-5)",
          trendData: stats.trends.quota,
          trendColor: "#f59e0b",
        },
        {
          label: t("DASHBOARD.STATISTICAL_TOKENS"),
          value: stats.totalTokens,
          icon: <LuBinary className="h-4 w-4" />,
          isLoading: quotaQuery.isLoading,
          accentColor: "var(--chart-1)",
          trendData: stats.trends.tokens,
          trendColor: "#ec4899",
        },
      ],
    },
    {
      title: t("DASHBOARD.PERFORMANCE_INDICATORS"),
      items: [
        {
          label: t("DASHBOARD.AVERAGE_RPM"),
          value: stats.avgRpm.toFixed(1),
          icon: <LuGauge className="h-4 w-4" />,
          isLoading: quotaQuery.isLoading,
          accentColor: "var(--chart-2)",
          trendData: stats.trends.rpm,
          trendColor: "#6366f1",
        },
        {
          label: t("DASHBOARD.AVERAGE_TPM"),
          value: stats.avgTpm.toFixed(1),
          icon: <LuActivity className="h-4 w-4" />,
          isLoading: quotaQuery.isLoading,
          accentColor: "var(--chart-4)",
          trendData: stats.trends.tpm,
          trendColor: "#f97316",
        },
      ],
    },
  ];

  return (
    <div className="divide-border grid grid-cols-1 divide-x-0 divide-y md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
      {cards.map((card, i) => (
        <StatsCard key={i} title={card.title} items={card.items} />
      ))}
    </div>
  );
}
