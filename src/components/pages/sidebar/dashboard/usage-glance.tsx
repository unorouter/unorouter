"use client";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useBurnRate } from "@/hooks/billing/use-burn-rate";
import { useDashboardData } from "@/hooks/ui/use-dashboard-data";
import type { IconName } from "@/lib/config/icon-map";
import { renderQuota } from "@/lib/config/constants";
import { formatPrice } from "@/lib/utils/format/number";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { processQuotaData } from "./stats";

function Spark(props: { data: number[]; color: string }) {
  if (props.data.length < 2) return <div className="h-10" />;
  const chartData = props.data.map((y, i) => ({ x: i, y }));
  const gradientId = `spark-${props.color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={props.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={props.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="y"
            stroke={props.color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function GlanceCard(props: {
  icon: IconName;
  label: string;
  value: string;
  caption: string;
  trend: number[];
  color: string;
  isLoading: boolean;
}) {
  return (
    <div className="border-border flex flex-col gap-2 border p-4">
      <div className="text-muted-foreground flex items-center gap-1.5">
        <Icon name={props.icon} className="h-3.5 w-3.5" />
        <span className="font-mono text-[10px] tracking-widest uppercase">
          {props.label}
        </span>
      </div>
      {props.isLoading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <span className="text-foreground text-2xl font-bold tracking-tight tabular-nums">
          {props.value}
        </span>
      )}
      <span className="text-muted-foreground text-[11px]">{props.caption}</span>
      <Spark data={props.trend} color={props.color} />
    </div>
  );
}

export function UsageGlance() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const dashboard = useDashboardData();
  const user = authQuery.data;
  const burnRate = useBurnRate(user?.quota);

  const stats = processQuotaData(dashboard.rawData, dashboard.periodMinutes);
  const isLoading = !user;
  const healthy = burnRate.available ? burnRate.daysRemaining > 30 : true;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="border-border bg-card border">
        <div className="border-border border-b p-5">
          <span className="text-foreground block text-sm font-semibold">
            {t("DASHBOARD.PANEL.USAGE_GLANCE")}
          </span>
          <span className="text-muted-foreground block text-xs">
            {t("DASHBOARD.PANEL.USAGE_GLANCE_DESC")}
          </span>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <GlanceCard
            icon="dollar-sign"
            label={t("DASHBOARD.PANEL.PERIOD_USAGE")}
            value={renderQuota(stats.totalQuota, 4)}
            caption={t("DASHBOARD.PANEL.PERIOD_USAGE_CAPTION")}
            trend={stats.trends.quota}
            color="var(--chart-1)"
            isLoading={isLoading}
          />
          <GlanceCard
            icon="trending-down"
            label={t("DASHBOARD.PANEL.HISTORICAL_USAGE")}
            value={renderQuota(user?.used_quota)}
            caption={t("DASHBOARD.PANEL.HISTORICAL_USAGE_CAPTION")}
            trend={stats.trends.tokens}
            color="var(--chart-2)"
            isLoading={isLoading}
          />
          <GlanceCard
            icon="send"
            label={t("DASHBOARD.STATS.REQUEST_COUNT")}
            value={(user?.request_count ?? 0).toLocaleString()}
            caption={t("DASHBOARD.PANEL.REQUEST_COUNT_CAPTION")}
            trend={stats.trends.count}
            color="var(--chart-4)"
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="border-border bg-card flex flex-col gap-4 border p-5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("DASHBOARD.PANEL.CREDIT_REMAINING")}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-green-500" : "bg-amber-500"}`}
            />
            <span className="text-muted-foreground font-mono text-[10px]">
              {healthy
                ? t("DASHBOARD.PANEL.HEALTHY")
                : t("DASHBOARD.PANEL.LOW")}
            </span>
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <span className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
            {renderQuota(user?.quota)}
          </span>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="border-border flex flex-col gap-1 border p-3">
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("DASHBOARD.PANEL.BURN_RATE")}
            </span>
            <span className="text-foreground font-mono text-xs font-semibold tabular-nums">
              {burnRate.available
                ? t("DASHBOARD.PANEL.PER_DAY", {
                    amount: formatPrice(burnRate.dollarsPerDay),
                  })
                : "-"}
            </span>
          </div>
          <div className="border-border flex flex-col gap-1 border p-3">
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("DASHBOARD.PANEL.RUNWAY")}
            </span>
            <span className="text-foreground font-mono text-xs font-semibold tabular-nums">
              {burnRate.available
                ? t("DASHBOARD.PANEL.DAYS_LEFT", {
                    days: burnRate.daysRemaining,
                  })
                : "-"}
            </span>
          </div>
        </div>

        <Link
          href="/billing"
          className="border-border hover:bg-accent mt-auto flex items-center justify-between border px-3 py-2 transition-colors"
        >
          <span className="font-mono text-xs">
            {t("DASHBOARD.PANEL.TOP_UP")}
          </span>
          <Icon name="arrow-right" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
