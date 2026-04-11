"use client";

import { PageHeader } from "@/components/elements/content/page-header";
import { PricingCard } from "@/components/elements/content/pricing-card";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useSubscriptionPlansQuery } from "@/hooks/subscription-hook";
import { useRouter } from "@/i18n/navigation";
import { RESET_TRANSLATION_KEYS, getMultiplier } from "@/lib/api/subscription";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useTranslations } from "next-intl";
import { LuZap } from "react-icons/lu";

export function Pricing() {
  const t = useTranslations();
  const router = useRouter();
  const authQuery = useAuthQuery();
  const { data } = useSubscriptionPlansQuery();
  const plans = data ?? [];

  function handleSubscribe() {
    if (authQuery.data) {
      router.push("/billing");
    } else {
      setCookie(AUTH_REDIRECT_COOKIE, "/billing", { maxAge: 300 });
      router.push("/login");
    }
  }

  function buildFeatures(planIndex: number): string[] {
    const features: string[] = [];
    features.push(t("PRICING.FEATURE.MODELS"));
    features.push(t("PRICING.FEATURE.FAILOVER"));
    features.push(t("PRICING.FEATURE.OPENAI_COMPAT"));
    if (planIndex >= 1) {
      features.push(t("PRICING.FEATURE.PRIORITY"));
    }
    if (planIndex >= 2) {
      features.push(t("PRICING.FEATURE.DEDICATED"));
    }
    features.push(t("PRICING.FEATURE.UPTIME"));
    return features;
  }

  return (
    <section className="border-border/50 relative z-10 border-t pt-24 pb-16">
      <div className="mx-auto max-w-360 px-6">
        <PageHeader
          badge={t("HOME.PRICING.LABEL")}
          badgeIcon={LuZap}
          title={t("PRICING.TITLE")}
          subtitle={t("PRICING.SUBTITLE")}
          centered
          className="mb-16"
        />

        {/* Pricing Cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const multiplier = getMultiplier(plan);
            const resetLabel = t(
              RESET_TRANSLATION_KEYS[plan.quotaResetPeriod] ??
                "BILLING.SUBSCRIPTION.PER_MONTH",
            );
            const quotaLabel =
              plan.quotaPerResetUsd > 0
                ? `$${plan.quotaPerResetUsd}${resetLabel}`
                : t("TOKEN.UNLIMITED");

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
                onSubscribe={handleSubscribe}
              />
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-muted-foreground font-mono text-xs">
            {t("HOME.PRICING.PAYG.DESC")}
          </p>
          <button
            type="button"
            onClick={handleSubscribe}
            className="text-foreground hover:text-muted-foreground mt-3 inline-block cursor-pointer font-mono text-xs font-bold tracking-widest uppercase transition-colors"
          >
            {t("HOME.PRICING.PAYG.NAME")} &rarr;
          </button>
        </div>
      </div>
    </section>
  );
}
