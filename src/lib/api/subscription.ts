import type { SubscriptionPlan } from "@/server/subscription/route";

const RESET_LABELS: Record<string, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

export function getResetLabel(plan: SubscriptionPlan): string {
  return RESET_LABELS[plan.quotaResetPeriod] ?? "period";
}

export function getMultiplier(plan: SubscriptionPlan): number {
  if (plan.priceAmount <= 0) return 0;
  return Math.round(plan.estimatedTotalUsd / plan.priceAmount);
}
