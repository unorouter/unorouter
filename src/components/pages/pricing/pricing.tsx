"use client";

import { useTranslations } from "next-intl";
import { PricingCard } from "@/components/elements/pricing-card";
import { useSubscriptionPlansQuery } from "@/hooks/subscription-hook";
import type { SubscriptionPlan } from "@/server/subscription/route";

const RESET_LABELS: Record<string, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

function buildFeatures(plan: SubscriptionPlan, allModelsLabel: string): string[] {
  const features: string[] = [];

  const resetLabel = RESET_LABELS[plan.quotaResetPeriod];
  if (resetLabel && plan.quotaPerResetUsd > 0) {
    features.push(`$${plan.quotaPerResetUsd} quota/${resetLabel}`);
  }

  const unit = plan.durationUnit === "year" ? "year" : plan.durationUnit === "month" ? "month" : "day";
  features.push(`${plan.durationValue} ${unit}${plan.durationValue > 1 ? "s" : ""} validity`);

  features.push(allModelsLabel);

  return features;
}

export function Pricing() {
  const t = useTranslations();
  const { data } = useSubscriptionPlansQuery();
  const plans = data?.plans ?? [];
  const allModelsLabel = t("PRICING.FEATURE_MODELS");

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold">{t("PRICING.TITLE")}</h1>
        <p className="text-muted-foreground mt-3 text-lg">{t("PRICING.SUBTITLE")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => {
          const multiplier = plan.priceAmount > 0
            ? Math.round(plan.estimatedTotalUsd / plan.priceAmount)
            : 0;
          return (
            <PricingCard
              key={plan.id}
              name={plan.title}
              price={plan.priceAmount}
              value={plan.estimatedTotalUsd}
              multiplier={`${multiplier}x`}
              popular={i === 1}
              features={buildFeatures(plan, allModelsLabel)}
              cta={t("PRICING.CTA")}
            />
          );
        })}
      </div>
    </div>
  );
}
