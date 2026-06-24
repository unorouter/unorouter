"use client";

import { PaymentMethodToggle } from "@/components/elements/billing/payment-method-toggle";
import { PageHeader } from "@/components/elements/content/page-header";
import { PricingCard } from "@/components/elements/content/pricing-card";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useSubscriptionPlansQuery } from "@/hooks/billing/subscription-hook";
import { useBillingActions } from "@/hooks/ui/use-billing-actions";
import { useRouter } from "@/i18n/navigation";
import {
  DEFAULT_TOPUP_AMOUNTS,
  getMultiplier,
  periodWordKey,
  type SubscriptionPlan,
} from "@/lib/api/subscription";
import { Icon } from "@/components/ui/icon";
import {
  AUTH_REDIRECT_COOKIE,
  type TranslationKey,
} from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useTranslations } from "next-intl";

type TopUpOption = {
  key: string;
  amount: number;
  handler: () => void;
};

export function Pricing() {
  const t = useTranslations();
  const router = useRouter();
  const authQuery = useAuthQuery();
  const plansQuery = useSubscriptionPlansQuery();
  const billing = useBillingActions();
  const plans = plansQuery.data ?? [];
  const isLoggedIn = !!authQuery.data;
  const topUpInfo = billing.topUpInfo;

  function redirectToLogin() {
    setCookie(AUTH_REDIRECT_COOKIE, "/pricing", { maxAge: 300 });
    router.push("/login");
  }

  function handleSubscribe(plan: SubscriptionPlan) {
    if (!isLoggedIn) {
      redirectToLogin();
      return;
    }
    billing.subscribe(plan, {
      isLoggedIn,
      onUnauthorized: () => router.push("/billing"),
    });
  }

  function buildTopUpOptions(): TopUpOption[] {
    if (!topUpInfo) return [];

    if (billing.paymentMethod === "crypto" && billing.enableNowPayments) {
      const amounts =
        (topUpInfo.amount_options ?? []).length > 0
          ? (topUpInfo.amount_options ?? [])
          : DEFAULT_TOPUP_AMOUNTS;
      return amounts.map((amount) => ({
        key: `nowpayments-${amount}`,
        amount,
        handler: isLoggedIn
          ? () => billing.payNowPayments(amount)
          : redirectToLogin,
      }));
    }

    if (billing.enableCreem && topUpInfo.creemProducts.length > 0) {
      return topUpInfo.creemProducts.map((product) => ({
        key: product.productId,
        amount: product.price,
        handler: isLoggedIn
          ? () => billing.payCreem(product.productId, product.price)
          : redirectToLogin,
      }));
    }

    if (billing.enableStripe && (topUpInfo.amount_options ?? []).length > 0) {
      return (topUpInfo.amount_options ?? []).map((amount) => ({
        key: `stripe-${amount}`,
        amount,
        handler: isLoggedIn ? () => billing.payStripe(amount) : redirectToLogin,
      }));
    }

    if (billing.enableStripe) {
      return DEFAULT_TOPUP_AMOUNTS.map((amount) => ({
        key: `stripe-${amount}`,
        amount,
        handler: isLoggedIn ? () => billing.payStripe(amount) : redirectToLogin,
      }));
    }

    return [];
  }

  function buildFeatures(planIndex: number): string[] {
    const features: string[] = [];
    features.push(t("PRICING.FEATURE.MODELS"));
    features.push(t("PRICING.FEATURE.FAILOVER"));
    features.push(t("PRICING.FEATURE.OPENAI_COMPAT"));
    if (planIndex >= 1) features.push(t("PRICING.FEATURE.PRIORITY"));
    if (planIndex >= 2) features.push(t("PRICING.FEATURE.DEDICATED"));
    features.push(t("PRICING.FEATURE.UPTIME"));
    return features;
  }

  const topUpOptions = buildTopUpOptions();

  return (
    <section className="border-border/50 relative z-10 border-t pt-24 pb-16">
      <div className="mx-auto max-w-360 px-6">
        <PageHeader
          badge={t("HOME.PRICING.LABEL")}
          badgeIcon="zap"
          title={t("PRICING.TITLE")}
          subtitle={t("PRICING.SUBTITLE")}
          centered
          className="mb-16"
        />

        {topUpOptions.length > 0 && (
          <div className="mx-auto mb-12 max-w-2xl">
            <div className="mb-4 text-center">
              <p className="font-mono text-[10px] tracking-[0.2em] text-emerald-600 uppercase dark:text-emerald-400">
                {t("PRICING.TOPUP.STEP")}
              </p>
              <h3 className="text-foreground mt-2 font-mono text-sm font-bold tracking-widest uppercase">
                {t("PRICING.TOPUP.LABEL")}
              </h3>
              <p className="text-muted-foreground mt-2 font-mono text-xs">
                {t("PRICING.TOPUP.DESC")}
              </p>
            </div>
            <div className="mb-6 flex justify-center">
              <PaymentMethodToggle centered />
            </div>
            <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-2">
              {topUpOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={option.handler}
                  disabled={billing.isTopUpMutating}
                  className="border-border hover:border-foreground/50 text-foreground flex min-w-20 cursor-pointer items-center justify-center border px-4 py-2.5 font-mono text-sm font-bold tabular-nums transition-colors disabled:opacity-50"
                >
                  ${option.amount}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-center font-mono text-[10px] tracking-wider uppercase">
              {t("PRICING.TOPUP.FOOTNOTE")}
            </p>
          </div>
        )}

        {topUpOptions.length > 0 && plans.length > 0 && (
          <div className="border-border/50 mx-auto mb-12 max-w-2xl border-t pt-10 text-center">
            <h3 className="text-foreground font-mono text-sm font-bold tracking-wide">
              {t("PRICING.BRIDGE.TITLE")}
            </h3>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md font-mono text-xs leading-relaxed">
              {t("PRICING.BRIDGE.DESC")}
            </p>
            <Icon
              name="chevron-down"
              className="mx-auto mt-4 h-5 w-5 text-emerald-500/70"
            />
          </div>
        )}

        {plans.length > 0 && (
          <p className="mb-6 text-center font-mono text-[10px] tracking-[0.2em] text-emerald-600 uppercase dark:text-emerald-400">
            {t("PRICING.PLANS.STEP")}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const tierKey = `PRICING.TIER.${i + 1}` as TranslationKey;
            const name = t.has(tierKey) ? t(tierKey) : plan.title;
            const periodKey = periodWordKey(plan.quotaResetPeriod);
            const deliveryLabel =
              plan.quotaPerResetUsd > 0 && periodKey
                ? t("PRICING.CARD.DELIVERY", {
                    amount: `$${plan.quotaPerResetUsd}`,
                    period: t(periodKey),
                  })
                : undefined;

            return (
              <PricingCard
                key={plan.id}
                name={name}
                price={plan.priceAmount}
                value={plan.estimatedTotalUsd}
                multiplier={`${getMultiplier(plan)}x`}
                deliveryLabel={deliveryLabel}
                popular={i === 1}
                features={buildFeatures(i)}
                cta={t("PRICING.CTA")}
                onSubscribe={() => handleSubscribe(plan)}
                disabled={billing.isSubMutating}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
