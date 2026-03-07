"use client";

import { PricingCard } from "@/components/elements/pricing-card";
import { useSubscriptionPlansQuery } from "@/hooks/subscription-hook";
import { getMultiplier, getResetLabel } from "@/lib/api/subscription";
import { useTranslations } from "next-intl";
import { LuShell, LuZap } from "react-icons/lu";

export function Pricing() {
  const t = useTranslations();
  const { data } = useSubscriptionPlansQuery();
  const plans = data ?? [];

  function buildFeatures(planIndex: number): string[] {
    const features: string[] = [];
    features.push(t("PRICING.FEATURE_MODELS"));
    features.push(t("PRICING.FEATURE_FAILOVER"));
    features.push(t("PRICING.FEATURE_OPENAI_COMPAT"));
    if (planIndex >= 1) {
      features.push(t("PRICING.FEATURE_PRIORITY"));
    }
    if (planIndex >= 2) {
      features.push(t("PRICING.FEATURE_DEDICATED"));
    }
    features.push(t("PRICING.FEATURE_UPTIME"));
    return features;
  }

  return (
    <section className="border-border/50 from-background to-card relative z-10 border-t bg-linear-to-b py-24">
      <div className="mx-auto max-w-360 px-6">
        <div className="mb-16 text-center">
          <div className="border-foreground/20 bg-foreground/5 mb-6 inline-flex items-center gap-2 rounded-sm border px-3 py-1.5">
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

        {/* Coming Soon Banner */}
        <div className="mb-12 overflow-hidden rounded-lg border border-red-600/20 bg-linear-to-r from-red-600/5 via-transparent to-red-600/5 p-6 md:flex md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-red-600/10">
              <LuShell className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-foreground font-mono text-sm font-bold">
                  {t("PRICING.BANNER_TITLE")}
                </h3>
                <span className="rounded-sm bg-red-600/20 px-2 py-0.5 font-mono text-[10px] tracking-[0.15em] text-red-500 uppercase">
                  {t("PRICING.BANNER_BADGE")}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 font-mono text-xs">
                {t("PRICING.BANNER_SUBTITLE")}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const multiplier = getMultiplier(plan);
            const resetLabel = getResetLabel(plan);
            const quotaLabel =
              plan.quotaPerResetUsd > 0
                ? `$${plan.quotaPerResetUsd}/${resetLabel}`
                : "Unlimited";

            return (
              <PricingCard
                key={plan.id}
                name={plan.title}
                price={plan.priceAmount}
                value={plan.estimatedTotalUsd}
                multiplier={`${multiplier}x`}
                quotaLabel={quotaLabel}
                popular={i === 1}
                features={buildFeatures(i)}
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
