"use client";

import { PageHeader } from "@/components/elements/page-header";
import { PricingCard } from "@/components/elements/pricing-card";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useSubscriptionPlansQuery } from "@/hooks/subscription-hook";
import { useRouter } from "@/i18n/navigation";
import { getMultiplier, getResetTranslationKey } from "@/lib/api/subscription";
import { APP_VALUES, AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useTranslations } from "next-intl";
import { LuShell, LuZap } from "react-icons/lu";

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
    <section className="border-border/50 relative z-10 border-t pt-24 pb-16">
      <div className="mx-auto max-w-360 px-6">
        <PageHeader
          badge={t("HOME.PRICING_LABEL")}
          badgeIcon={LuZap}
          title={t("PRICING.TITLE")}
          subtitle={t("PRICING.SUBTITLE")}
          centered
          className="mb-16"
        />

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
                {t("PRICING.BANNER_SUBTITLE", APP_VALUES)}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const multiplier = getMultiplier(plan);
            const resetLabel = t(getResetTranslationKey(plan));
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
            {t("HOME.PRICING_PAYG_DESC")}
          </p>
          <button
            type="button"
            onClick={handleSubscribe}
            className="text-foreground hover:text-muted-foreground mt-3 inline-block cursor-pointer font-mono text-xs font-bold tracking-widest uppercase transition-colors"
          >
            {t("HOME.PRICING_PAYG_NAME")} &rarr;
          </button>
        </div>
      </div>
    </section>
  );
}
