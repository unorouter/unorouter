import type { SubscriptionPlanDTO } from "@/openapi";
import { msg, type TranslationKey } from "../config/constants";

export const BILLING_PREFERENCE_OPTIONS = [
  { value: "wallet_first", key: msg("BILLING.PREFERENCE.WALLET_FIRST") },
  { value: "wallet_only", key: msg("BILLING.PREFERENCE.WALLET_ONLY") },
  {
    value: "subscription_first",
    key: msg("BILLING.PREFERENCE.SUBSCRIPTION_FIRST"),
  },
  {
    value: "subscription_only",
    key: msg("BILLING.PREFERENCE.SUBSCRIPTION_ONLY"),
  },
] as const;

export const RESET_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  daily: "BILLING.SUBSCRIPTION.PER_DAY",
  weekly: "BILLING.SUBSCRIPTION.PER_WEEK",
  monthly: "BILLING.SUBSCRIPTION.PER_MONTH",
};

export const DEFAULT_TOPUP_AMOUNTS = [1, 5, 10, 20, 50, 100, 200, 500] as const;

const RESET_PERIOD_LABEL_KEYS: Record<string, TranslationKey> = {
  daily: "BILLING.SUBSCRIPTION.DAILY",
  weekly: "BILLING.SUBSCRIPTION.WEEKLY",
  monthly: "BILLING.SUBSCRIPTION.MONTHLY",
};

export function resetPeriodLabelKey(period: string): TranslationKey {
  return RESET_PERIOD_LABEL_KEYS[period] ?? (period as TranslationKey);
}

export function resetPeriodSuffixKey(period: string): TranslationKey {
  return RESET_TRANSLATION_KEYS[period] ?? ("" as TranslationKey);
}

const PERIOD_WORD_KEYS: Record<string, TranslationKey> = {
  daily: "PRICING.CARD.PERIOD_DAY",
  weekly: "PRICING.CARD.PERIOD_WEEK",
  monthly: "PRICING.CARD.PERIOD_MONTH",
};

export function periodWordKey(period: string): TranslationKey | null {
  return PERIOD_WORD_KEYS[period] ?? null;
}

export type SubscriptionPlan = ReturnType<typeof processPlans>[number];

export function getMultiplier(plan: SubscriptionPlan): number {
  if (plan.priceAmount <= 0) return 0;
  return Math.round(plan.estimatedTotalUsd / plan.priceAmount);
}

export function processPlans(raw: SubscriptionPlanDTO[] | null) {
  return (raw ?? [])
    .filter((entry) => entry.plan?.enabled)
    .map((entry) => {
      const p = entry.plan!;
      return {
        id: p.id ?? 0,
        title: p.title ?? "",
        subtitle: p.subtitle ?? "",
        priceAmount: p.price_amount ?? 0,
        currency: p.currency ?? "USD",
        durationUnit: p.duration_unit ?? "month",
        durationValue: p.duration_value ?? 1,
        quotaPerResetUsd: entry.quota_per_reset_usd,
        quotaResetPeriod: p.quota_reset_period ?? "never",
        estimatedTotalUsd: entry.estimated_total_usd,
        upgradeGroup: p.upgrade_group ?? "",
        sortOrder: p.sort_order ?? 0,
      };
    })
    .sort((a, b) => b.sortOrder - a.sortOrder || a.priceAmount - b.priceAmount);
}
