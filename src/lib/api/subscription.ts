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

export const RESET_PERIOD_LABEL_KEYS: Record<string, TranslationKey> = {
  daily: "BILLING.SUBSCRIPTION.DAILY",
  weekly: "BILLING.SUBSCRIPTION.WEEKLY",
  monthly: "BILLING.SUBSCRIPTION.MONTHLY",
};

export const PERIOD_WORD_KEYS: Record<string, TranslationKey> = {
  daily: "PRICING.CARD.PERIOD_DAY",
  weekly: "PRICING.CARD.PERIOD_WEEK",
  monthly: "PRICING.CARD.PERIOD_MONTH",
};
