"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { useDashboardStatQuery } from "@/hooks/dashboard-hook";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import {
  LuWallet,
  LuTrendingDown,
  LuSend,
  LuHash,
  LuDollarSign,
  LuBinary,
  LuGauge,
  LuActivity,
} from "react-icons/lu";

function renderQuota(quota: number | undefined): string {
  if (quota === undefined || quota === null) return "$0.00";
  return `$${(quota / 500000).toFixed(2)}`;
}

type StatItemProps = {
  label: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  isLoading: boolean;
  accentColor: string;
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
          <span className="text-foreground block text-lg font-bold tabular-nums tracking-tight">
            {typeof props.value === "number"
              ? props.value.toLocaleString()
              : (props.value ?? "—")}
          </span>
        )}
      </div>
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
  const statQuery = useDashboardStatQuery();

  const user = authQuery.data as
    | {
        quota?: number;
        used_quota?: number;
        request_count?: number;
      }
    | undefined;

  const stat = statQuery.data as
    | { quota?: number; rpm?: number; tpm?: number }
    | undefined;

  const isLoading = authQuery.isLoading || statQuery.isLoading;

  const cards: StatsCardProps[] = [
    {
      title: t("DASHBOARD.ACCOUNT_DATA"),
      items: [
        {
          label: t("DASHBOARD.CURRENT_BALANCE"),
          value: renderQuota(user?.quota),
          icon: <LuWallet className="h-4 w-4" />,
          isLoading,
          accentColor: "var(--chart-2)",
        },
        {
          label: t("DASHBOARD.CONSUMPTION"),
          value: renderQuota(user?.used_quota),
          icon: <LuTrendingDown className="h-4 w-4" />,
          isLoading,
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
          isLoading,
          accentColor: "var(--chart-1)",
        },
        {
          label: t("DASHBOARD.STATISTICAL_COUNT"),
          value: stat?.quota !== undefined ? renderQuota(stat.quota) : undefined,
          icon: <LuHash className="h-4 w-4" />,
          isLoading,
          accentColor: "var(--chart-4)",
        },
      ],
    },
    {
      title: t("DASHBOARD.RESOURCE_CONSUMPTION"),
      items: [
        {
          label: t("DASHBOARD.STATISTICAL_QUOTA"),
          value: stat?.quota !== undefined ? renderQuota(stat.quota) : undefined,
          icon: <LuDollarSign className="h-4 w-4" />,
          isLoading,
          accentColor: "var(--chart-5)",
        },
        {
          label: t("DASHBOARD.STATISTICAL_TOKENS"),
          value: stat?.tpm !== undefined ? Math.round(stat.tpm * 60) : undefined,
          icon: <LuBinary className="h-4 w-4" />,
          isLoading,
          accentColor: "var(--chart-1)",
        },
      ],
    },
    {
      title: t("DASHBOARD.PERFORMANCE_INDICATORS"),
      items: [
        {
          label: t("DASHBOARD.AVERAGE_RPM"),
          value: stat?.rpm !== undefined ? stat.rpm.toFixed(1) : undefined,
          icon: <LuGauge className="h-4 w-4" />,
          isLoading,
          accentColor: "var(--chart-2)",
        },
        {
          label: t("DASHBOARD.AVERAGE_TPM"),
          value: stat?.tpm !== undefined ? stat.tpm.toFixed(1) : undefined,
          icon: <LuActivity className="h-4 w-4" />,
          isLoading,
          accentColor: "var(--chart-4)",
        },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 divide-x-0 divide-y md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4 divide-border">
      {cards.map((card, i) => (
        <StatsCard key={i} title={card.title} items={card.items} />
      ))}
    </div>
  );
}
