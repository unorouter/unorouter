"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useDashboardQuotaQuery } from "@/hooks/billing/dashboard-hook";
import { quotaToDollars } from "@/lib/config/constants";
import { BURN_RATE_WINDOW_DAYS, burnRateWindow } from "@/store/dashboard-store";

export type BurnRate =
  | { available: false }
  | { available: true; dollarsPerDay: number; daysRemaining: number };

/**
 * Projects how long the current balance lasts from recent spend. Any missing,
 * empty or zero-spend window yields `available: false` so callers render
 * nothing rather than an Infinity/NaN runway.
 */
export function useBurnRate(
  balanceQuota: number | undefined,
  days = BURN_RATE_WINDOW_DAYS,
): BurnRate {
  const isLoggedIn = !!useAuthQuery().data;
  const quotaQuery = useDashboardQuotaQuery(burnRateWindow(days), {
    enabled: isLoggedIn,
  });

  const rows = quotaQuery.data ?? [];
  if (!isLoggedIn || quotaQuery.isError || rows.length === 0) {
    return { available: false };
  }

  const spentQuota = rows.reduce((sum, row) => sum + (row.quota ?? 0), 0);
  const dollarsPerDay = quotaToDollars(spentQuota) / days;
  const balance = quotaToDollars(balanceQuota ?? 0);

  if (!Number.isFinite(dollarsPerDay) || dollarsPerDay <= 0 || balance <= 0) {
    return { available: false };
  }

  return {
    available: true,
    dollarsPerDay,
    daysRemaining: Math.floor(balance / dollarsPerDay),
  };
}
