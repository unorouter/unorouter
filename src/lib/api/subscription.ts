import type { ResponseArrayControllerSubscriptionPlanDTODataItem } from "@/openapi";
import { QUOTA_PER_DOLLAR, TranslationKey } from "../config/constants";

export const RESET_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  daily: "BILLING.SUBSCRIPTION.PER_DAY",
  weekly: "BILLING.SUBSCRIPTION.PER_WEEK",
  monthly: "BILLING.SUBSCRIPTION.PER_MONTH",
};

export type SubscriptionPlan = ReturnType<typeof processPlans>[number];

export function getMultiplier(plan: SubscriptionPlan): number {
  if (plan.priceAmount <= 0) return 0;
  return Math.round(plan.estimatedTotalUsd / plan.priceAmount);
}

function estimateResetsPerDuration(
  resetPeriod: string,
  durationUnit: string,
  durationValue: number,
): number {
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
      return 1;
  }

  if (resetSeconds <= 0 || durationSeconds <= 0) return 0;
  return Math.floor(durationSeconds / resetSeconds);
}

export function processPlans(
  raw: ResponseArrayControllerSubscriptionPlanDTODataItem[],
) {
  return raw
    .filter((entry) => entry.plan?.enabled)
    .map((entry) => {
      const p = entry.plan!;
      const totalAmount = p.total_amount ?? 0;
      const quotaPerResetUsd = totalAmount / QUOTA_PER_DOLLAR;
      const durationUnit = p.duration_unit ?? "month";
      const durationValue = p.duration_value ?? 1;
      const resetPeriod = p.quota_reset_period ?? "never";
      const resets = estimateResetsPerDuration(
        resetPeriod,
        durationUnit,
        durationValue,
      );

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
