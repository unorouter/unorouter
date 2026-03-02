import {
  getSubscriptionPlans,
  type ResponseModelSubscriptionPlanData,
} from "@/openapi";
import { Elysia } from "elysia";

const AUTH_HEADERS = {
  Authorization: process.env.SYSTEM_ACCESS_TOKEN,
  "New-Api-User": "1",
};

const QUOTA_PER_UNIT = 500_000;

type PlansResponse = {
  data?: { plan?: ResponseModelSubscriptionPlanData }[];
};

export type SubscriptionPlan = {
  id: number;
  title: string;
  subtitle: string;
  priceAmount: number;
  currency: string;
  durationUnit: string;
  durationValue: number;
  quotaPerResetUsd: number;
  quotaResetPeriod: string;
  estimatedTotalUsd: number;
  upgradeGroup: string;
  sortOrder: number;
};

function estimateResetsPerDuration(
  resetPeriod: string,
  durationUnit: string,
  durationValue: number,
): number {
  // Match new-api's getResetPeriodsCount logic exactly
  let durationSeconds: number;
  switch (durationUnit) {
    case "year":
      durationSeconds = durationValue * 365.25 * 86400;
      break;
    case "month":
      durationSeconds = durationValue * 30.44 * 86400;
      break;
    case "day":
      durationSeconds = durationValue * 86400;
      break;
    case "hour":
      durationSeconds = durationValue * 3600;
      break;
    default:
      return 1;
  }

  let resetSeconds: number;
  switch (resetPeriod) {
    case "daily":
      resetSeconds = 86400;
      break;
    case "weekly":
      resetSeconds = 7 * 86400;
      break;
    case "monthly":
      resetSeconds = 30.44 * 86400;
      break;
    default:
      return 1; // "never" or unknown: quota is used once
  }

  if (resetSeconds <= 0 || durationSeconds <= 0) return 0;
  return Math.floor(durationSeconds / resetSeconds);
}

function processPlans(
  raw: { plan?: ResponseModelSubscriptionPlanData }[],
): SubscriptionPlan[] {
  return raw
    .filter((entry) => entry.plan?.enabled)
    .map((entry) => {
      const p = entry.plan!;
      const totalAmount = p.total_amount ?? 0;
      const quotaPerResetUsd = totalAmount / QUOTA_PER_UNIT;
      const durationUnit = p.duration_unit ?? "month";
      const durationValue = p.duration_value ?? 1;
      const resetPeriod = p.quota_reset_period ?? "never";
      const resets = estimateResetsPerDuration(resetPeriod, durationUnit, durationValue);

      return {
        id: p.id ?? 0,
        title: p.title ?? "",
        subtitle: p.subtitle ?? "",
        priceAmount: p.price_amount ?? 0,
        currency: p.currency ?? "USD",
        durationUnit,
        durationValue,
        quotaPerResetUsd,
        quotaResetPeriod: resetPeriod,
        estimatedTotalUsd: Math.round(quotaPerResetUsd * resets * 100) / 100,
        upgradeGroup: p.upgrade_group ?? "",
        sortOrder: p.sort_order ?? 0,
      };
    })
    .sort((a, b) => b.sortOrder - a.sortOrder || a.priceAmount - b.priceAmount);
}

export const subscriptionRoute = new Elysia({
  prefix: "/subscription",
}).get("/plans", async () => {
  const res = await getSubscriptionPlans({ headers: AUTH_HEADERS });
  const body = res.data as PlansResponse;
  const plans = processPlans(body.data ?? []);
  return { plans };
});
