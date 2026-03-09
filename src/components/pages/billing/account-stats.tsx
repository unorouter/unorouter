"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { LuWallet, LuTrendingDown, LuSend } from "react-icons/lu";

function renderQuota(quota: number | undefined): string {
  if (quota === undefined || quota === null) return "$0.00";
  return `$${(quota / 500000).toFixed(2)}`;
}

export function AccountStats() {
  const t = useTranslations() as (key: string) => string;
  const authQuery = useAuthQuery();

  const user = authQuery.data as
    | { quota?: number; used_quota?: number; request_count?: number }
    | undefined;

  const isLoading = authQuery.isLoading;

  const stats = [
    {
      label: t("BILLING.CURRENT_BALANCE"),
      value: renderQuota(user?.quota),
      icon: <LuWallet className="h-4 w-4" />,
      color: "var(--chart-2)",
    },
    {
      label: t("BILLING.CONSUMPTION"),
      value: renderQuota(user?.used_quota),
      icon: <LuTrendingDown className="h-4 w-4" />,
      color: "var(--chart-3)",
    },
    {
      label: t("BILLING.REQUESTS"),
      value:
        user?.request_count !== undefined
          ? user.request_count.toLocaleString()
          : "0",
      icon: <LuSend className="h-4 w-4" />,
      color: "var(--chart-1)",
    },
  ];

  return (
    <div className="border-border overflow-hidden border">
      <div className="bg-border grid grid-cols-1 gap-px md:grid-cols-3">
        {stats.map((stat, i) => (
          <div key={i} className="bg-background flex items-center gap-3 p-5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center"
              style={{ color: stat.color }}
            >
              {stat.icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-muted-foreground block font-mono text-[10px] tracking-widest uppercase">
                {stat.label}
              </span>
              {isLoading ? (
                <Skeleton className="mt-1 h-5 w-20" />
              ) : (
                <span className="text-foreground block text-lg font-bold tabular-nums tracking-tight">
                  {stat.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
