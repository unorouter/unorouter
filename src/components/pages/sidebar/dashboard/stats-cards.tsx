"use client";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/ui/use-dashboard-data";
import type { IconName } from "@/lib/config/icon-map";
import { formatTokens } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { processQuotaData, renderQuota } from "./stats";

type TileProps = {
  icon: IconName;
  label: string;
  value: string;
  caption: string;
  isLoading: boolean;
};

function Tile(props: TileProps) {
  return (
    <div className="flex flex-col gap-2 p-5">
      <div className="text-muted-foreground flex items-center gap-1.5">
        <Icon name={props.icon} className="h-3.5 w-3.5" />
        <span className="font-mono text-[10px] tracking-widest uppercase">
          {props.label}
        </span>
      </div>
      {props.isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <span className="text-foreground text-2xl font-bold tracking-tight tabular-nums">
          {props.value}
        </span>
      )}
      <span className="text-muted-foreground text-[11px]">{props.caption}</span>
    </div>
  );
}

export function StatsCards() {
  const t = useTranslations();
  const dashboard = useDashboardData();
  const stats = processQuotaData(dashboard.rawData, dashboard.periodMinutes);
  const isLoading = !dashboard.quotaQuery.data;

  const tiles: TileProps[] = [
    {
      icon: "hash",
      label: t("DASHBOARD.STATS.STATISTICAL_COUNT"),
      value: stats.totalCount.toLocaleString(),
      caption: t("DASHBOARD.STATS.STATISTICAL_COUNT_CAPTION"),
      isLoading,
    },
    {
      icon: "dollar-sign",
      label: t("DASHBOARD.STATS.STATISTICAL_QUOTA"),
      value: renderQuota(stats.totalQuota, 4),
      caption: t("DASHBOARD.STATS.STATISTICAL_QUOTA_CAPTION"),
      isLoading,
    },
    {
      icon: "binary",
      label: t("DASHBOARD.STATS.STATISTICAL_TOKENS"),
      value: formatTokens(stats.totalTokens),
      caption: t("DASHBOARD.STATS.STATISTICAL_TOKENS_CAPTION"),
      isLoading,
    },
    {
      icon: "gauge",
      label: t("DASHBOARD.STATS.AVERAGE_RPM"),
      value: stats.avgRpm.toFixed(2),
      caption: t("DASHBOARD.STATS.AVERAGE_RPM_CAPTION"),
      isLoading,
    },
    {
      icon: "zap",
      label: t("DASHBOARD.STATS.AVERAGE_TPM"),
      value: formatTokens(Math.round(stats.avgTpm)),
      caption: t("DASHBOARD.STATS.AVERAGE_TPM_CAPTION"),
      isLoading,
    },
  ];

  return (
    <div className="divide-border grid grid-cols-1 divide-y sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:divide-x xl:divide-y-0">
      {tiles.map((tile) => (
        <Tile key={tile.label} {...tile} />
      ))}
    </div>
  );
}
