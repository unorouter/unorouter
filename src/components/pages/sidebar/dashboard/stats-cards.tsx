"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useDashboardData } from "@/hooks/ui/use-dashboard-data";
import { useTranslations } from "next-intl";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { processQuotaData, renderQuota } from "./stats";
import { Icon } from "@/components/ui/icon";

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

export function StatsCards() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const { periodMinutes, quotaQuery, rawData } = useDashboardData();

  const user = authQuery.data;

  const stats = processQuotaData(rawData, periodMinutes);

  const cards: StatsCardProps[] = [
    {
      title: t("DASHBOARD.STATS.ACCOUNT_DATA"),
      items: [
        {
          label: t("DASHBOARD.STATS.CURRENT_BALANCE"),
          value: renderQuota(user?.quota),
          icon: <Icon name="wallet" className="h-4 w-4" />,
          isLoading: !user,
          accentColor: "var(--chart-2)",
        },
        {
          label: t("DASHBOARD.CONSUMPTION"),
          value: renderQuota(user?.used_quota),
          icon: <Icon name="trending-down" className="h-4 w-4" />,
          isLoading: !user,
          accentColor: "var(--chart-3)",
        },
      ],
    },
    {
      title: t("DASHBOARD.STATS.USAGE_STATISTICS"),
      items: [
        {
          label: t("DASHBOARD.STATS.REQUEST_COUNT"),
          value: user?.request_count,
          icon: <Icon name="send" className="h-4 w-4" />,
          isLoading: !user,
          accentColor: "var(--chart-1)",
        },
        {
          label: t("DASHBOARD.STATS.STATISTICAL_COUNT"),
          value: stats.totalCount,
          icon: <Icon name="hash" className="h-4 w-4" />,
          isLoading: !quotaQuery.data,
          accentColor: "var(--chart-4)",
          trendData: stats.trends.count,
          trendColor: "#06b6d4",
        },
      ],
    },
    {
      title: t("DASHBOARD.STATS.RESOURCE_CONSUMPTION"),
      items: [
        {
          label: t("DASHBOARD.STATS.STATISTICAL_QUOTA"),
          value: renderQuota(stats.totalQuota),
          icon: <Icon name="dollar-sign" className="h-4 w-4" />,
          isLoading: !quotaQuery.data,
          accentColor: "var(--chart-5)",
          trendData: stats.trends.quota,
          trendColor: "#f59e0b",
        },
        {
          label: t("DASHBOARD.STATS.STATISTICAL_TOKENS"),
          value: stats.totalTokens,
          icon: <Icon name="binary" className="h-4 w-4" />,
          isLoading: !quotaQuery.data,
          accentColor: "var(--chart-1)",
          trendData: stats.trends.tokens,
          trendColor: "#ec4899",
        },
      ],
    },
    {
      title: t("DASHBOARD.STATS.PERFORMANCE_INDICATORS"),
      items: [
        {
          label: t("DASHBOARD.STATS.AVERAGE_RPM"),
          value: stats.avgRpm.toFixed(1),
          icon: <Icon name="gauge" className="h-4 w-4" />,
          isLoading: !quotaQuery.data,
          accentColor: "var(--chart-2)",
          trendData: stats.trends.rpm,
          trendColor: "#6366f1",
        },
        {
          label: t("DASHBOARD.STATS.AVERAGE_TPM"),
          value: stats.avgTpm.toFixed(1),
          icon: <Icon name="activity" className="h-4 w-4" />,
          isLoading: !quotaQuery.data,
          accentColor: "var(--chart-4)",
          trendData: stats.trends.tpm,
          trendColor: "#f97316",
        },
      ],
    },
  ];

  return (
    <div className="divide-border grid grid-cols-1 divide-y md:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-y-0">
      {cards.map((card, i) => (
        <StatsCard key={i} title={card.title} items={card.items} />
      ))}
    </div>
  );
}
