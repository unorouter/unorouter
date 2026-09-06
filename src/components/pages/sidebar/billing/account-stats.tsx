"use client";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useBurnRate } from "@/hooks/billing/use-burn-rate";
import { quotaToDollars, renderQuota } from "@/lib/config/constants";
import { useTranslations } from "next-intl";

const LOW_BALANCE_DOLLARS = 5;
const LOW_BALANCE_DAYS = 14;
const CRITICAL_BALANCE_DOLLARS = 1;
const CRITICAL_BALANCE_DAYS = 3;

export function AccountStats() {
  const t = useTranslations();
  const authQuery = useAuthQuery();

  const user = authQuery.data;
  const isLoading = authQuery.isLoading;
  const burn = useBurnRate(user?.quota);

  const balance = quotaToDollars(user?.quota ?? 0);
  const isLow =
    !isLoading &&
    (burn.available
      ? burn.daysRemaining < LOW_BALANCE_DAYS
      : balance < LOW_BALANCE_DOLLARS);
  const isCritical =
    isLow &&
    (burn.available
      ? burn.daysRemaining < CRITICAL_BALANCE_DAYS
      : balance < CRITICAL_BALANCE_DOLLARS);
  const balanceColor = isCritical
    ? "text-destructive"
    : isLow
      ? "text-amber-600 dark:text-amber-400"
      : "text-foreground";

  const secondary = [
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
    <div className="border-border border">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <span className="text-muted-foreground block font-mono text-[10px] tracking-widest uppercase">
            {t("BILLING.CURRENT_BALANCE")}
          </span>
          {isLoading ? (
            <Skeleton className="mt-2 h-10 w-40" />
          ) : (
            <span
              className={`block text-4xl font-bold tracking-tight tabular-nums ${balanceColor}`}
            >
              {renderQuota(user?.quota)}
            </span>
          )}
          {!isLoading && burn.available && (
            <span className="text-muted-foreground mt-2 block font-mono text-xs">
              {t("BILLING.BALANCE.RUNWAY", {
                days: burn.daysRemaining,
                // 2dp rounds a sub-cent burn so balance/rate no longer reconciles with days.
                rate: `$${burn.dollarsPerDay.toFixed(
                  burn.dollarsPerDay < 0.1 ? 4 : 2,
                )}`,
              })}
            </span>
          )}
          {!isLoading && isCritical && (
            <span className="text-destructive mt-2 block font-mono text-xs">
              {t("BILLING.BALANCE.LOW")}
            </span>
          )}
        </div>
      </div>

      <div className="bg-border grid grid-cols-1 gap-px border-t md:grid-cols-2">
        {secondary.map((stat, i) => (
          <div key={i} className="bg-background flex items-center gap-3 p-4">
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
                <span className="text-foreground block text-base font-bold tracking-tight tabular-nums">
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
