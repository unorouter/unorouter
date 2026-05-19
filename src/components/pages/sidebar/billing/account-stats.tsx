"use client";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { renderQuota } from "@/lib/config/constants";
import { useTranslations } from "next-intl";

export function AccountStats() {
  const t = useTranslations();
  const authQuery = useAuthQuery();

  const user = authQuery.data;
  const isLoading = authQuery.isLoading;

  const stats = [
    {
      label: t("BILLING.CURRENT_BALANCE"),
      value: renderQuota(user?.quota),
      icon: <Icon name="wallet" className="h-4 w-4" />,
      color: "var(--chart-2)",
    },
    {
      label: t("BILLING.CONSUMPTION"),
      value: renderQuota(user?.used_quota),
      icon: <Icon name="trending-down" className="h-4 w-4" />,
      color: "var(--chart-3)",
    },
    {
      label: t("BILLING.REQUESTS"),
      value:
        user?.request_count !== undefined
          ? user.request_count.toLocaleString()
          : "0",
      icon: <Icon name="send" className="h-4 w-4" />,
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
                <span className="text-foreground block text-lg font-bold tracking-tight tabular-nums">
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
