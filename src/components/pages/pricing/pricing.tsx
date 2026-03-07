"use client";

import { PricingCard } from "@/components/elements/pricing-card";
import { useSubscriptionPlansQuery } from "@/hooks/subscription-hook";
import {
  getMultiplier,
  getResetLabel,
  type SubscriptionPlan,
} from "@/lib/api/subscription";
import { useTranslations } from "next-intl";
import { LuZap } from "react-icons/lu";

function buildFeatures(
  plan: SubscriptionPlan,
  allModelsLabel: string,
): string[] {
  const features: string[] = [];

  const resetLabel = getResetLabel(plan);
  if (resetLabel && plan.quotaPerResetUsd > 0) {
    features.push(`$${plan.quotaPerResetUsd} quota/${resetLabel}`);
  }

  const unit =
    plan.durationUnit === "year"
      ? "year"
      : plan.durationUnit === "month"
        ? "month"
        : "day";
  features.push(
    `${plan.durationValue} ${unit}${plan.durationValue > 1 ? "s" : ""} validity`,
  );

  features.push(allModelsLabel);

  return features;
}

export function Pricing() {
  const t = useTranslations();
  const { data } = useSubscriptionPlansQuery();
  const plans = data ?? [];
  const allModelsLabel = t("PRICING.FEATURE_MODELS");

  return (
    <section className="border-border/50 from-background to-card relative z-10 border-t bg-linear-to-b py-24">
      <div className="mx-auto max-w-360 px-6">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-foreground/20 bg-foreground/5 px-3 py-1.5">
            <LuZap className="text-foreground h-3 w-3" />
            <span className="text-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
              {t("HOME.PRICING_LABEL")}
            </span>
          </div>
          <h2 className="text-foreground mb-4 text-3xl leading-[1.1] font-bold tracking-tight md:text-5xl">
            {t("PRICING.TITLE")}
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl font-mono text-sm leading-relaxed">
            {t("PRICING.SUBTITLE")}
          </p>
        </div>

        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const multiplier = getMultiplier(plan);
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

        <div className="text-center">
          <p className="text-muted-foreground font-mono text-xs">
            {t("HOME.PRICING_PAYG_DESC")}
          </p>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/register`}
            className="text-foreground hover:text-muted-foreground mt-3 inline-block font-mono text-xs font-bold tracking-widest uppercase transition-colors"
          >
            {t("HOME.PRICING_PAYG_NAME")} &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
