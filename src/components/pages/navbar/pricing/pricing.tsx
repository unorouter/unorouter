"use client";

import { PaymentMethodToggle } from "@/components/elements/billing/payment-method-toggle";
import { PageHeader } from "@/components/elements/content/page-header";
import { PricingCard } from "@/components/elements/content/pricing-card";
import { Icon } from "@/components/ui/icon";
import { env } from "@/lib/config/env";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import { useSubscriptionPlansQuery } from "@/hooks/billing/subscription-hook";
import { useBillingActions } from "@/hooks/ui/use-billing-actions";
import { useRouter } from "@/i18n/navigation";
import {
  DEFAULT_TOPUP_AMOUNTS,
  periodWordKey,
  type SubscriptionPlan,
} from "@/lib/api/subscription";
import {
  AUTH_REDIRECT_COOKIE,
  type TranslationKey,
} from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useState } from "react";
import { useTranslations } from "next-intl";

type TopUpOption = {
  key: string;
  amount: number;
  handler: () => void;
};

// Mirrors the upstream Creem handler's bounds so the field rejects what the
// API would. Only Creem supports a custom price; the Stripe and crypto lanes
// still need a preset.
const CUSTOM_MIN = 1;
const CUSTOM_MAX = 100000;

export function Pricing() {
  const t = useTranslations();
  const router = useRouter();
  const authQuery = useAuthQuery();
  const plansQuery = useSubscriptionPlansQuery();
  const billing = useBillingActions();
  const plans = plansQuery.data ?? [];
  const hydrated = useHydrated();
  const isLoggedIn = hydrated && !!authQuery.data;
  const topUpInfo = billing.topUpInfo;
  const [customAmount, setCustomAmount] = useState("");

  // Any configured product carries the custom amount (Creem still requires a
  // product_id); the cheapest gives the finest price/quota ratio to scale from.
  // Empty string when Creem is not the active lane, which hides the field.
  const customTopUpProductId =
    billing.paymentMethod === "card" && billing.enableCreem
      ? ((topUpInfo?.creemProducts ?? [])
          .filter((p) => p.price > 0)
          .sort((a, b) => a.price - b.price)[0]?.productId ?? "")
      : "";

  const parsedCustom = Number(customAmount);
  const customValid =
    customAmount.trim() !== "" &&
    Number.isFinite(parsedCustom) &&
    parsedCustom >= CUSTOM_MIN &&
    parsedCustom <= CUSTOM_MAX;

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

  // The tiers differ only in how much credit they carry, which the price hero already
  // states. Everything here has to hold for every tier.
  function buildFeatures(): string[] {
    return [
      t("PRICING.FEATURE.CREDIT"),
      t("PRICING.FEATURE.NO_FREE_LIMIT"),
      t("PRICING.FEATURE.MODELS"),
      t("PRICING.FEATURE.FAILOVER"),
      t("PRICING.FEATURE.OPENAI_COMPAT"),
    ];
  }

  function deliveryLabelFor(plan: SubscriptionPlan): string | undefined {
    const periodKey = periodWordKey(plan.quotaResetPeriod);
    if (plan.quotaPerResetUsd <= 0 || !periodKey) return undefined;
    return t("PRICING.CARD.DELIVERED", {
      amount: `$${plan.quotaPerResetUsd}`,
      period: t(periodKey),
    });
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
              <p className="font-mono text-[10px] tracking-[0.2em] text-emerald-700 uppercase dark:text-emerald-400">
                {t("PRICING.TOPUP.STEP")}
              </p>
              <h2 className="text-foreground mt-2 font-mono text-sm font-bold tracking-widest uppercase">
                {t("PRICING.TOPUP.LABEL")}
              </h2>
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
            {customTopUpProductId && (
              <div className="mx-auto mt-2 flex max-w-xl items-center justify-center gap-2">
                <div className="border-border focus-within:border-foreground/50 flex items-center border px-3 py-2 transition-colors">
                  <span className="text-muted-foreground font-mono text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={CUSTOM_MIN}
                    max={CUSTOM_MAX}
                    step="1"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={String(CUSTOM_MIN)}
                    className="text-foreground w-24 bg-transparent pl-1 font-mono text-sm font-bold tabular-nums outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={!customValid || billing.isTopUpMutating}
                  onClick={
                    isLoggedIn
                      ? () =>
                          billing.payCreem(
                            customTopUpProductId,
                            Number(customAmount),
                            true,
                          )
                      : redirectToLogin
                  }
                  className="border-border hover:border-foreground/50 text-foreground flex cursor-pointer items-center justify-center border px-4 py-2.5 font-mono text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("BILLING.TOPUP.PAY")}
                </button>
              </div>
            )}
            <p className="text-muted-foreground mt-3 text-center font-mono text-[10px] tracking-wider uppercase">
              {t("PRICING.TOPUP.FOOTNOTE")}
            </p>
            {env.discordUrl && (
              <a
                href={env.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground mt-3 inline-flex w-full items-center justify-center gap-1.5 text-xs transition-colors"
              >
                <Icon name="brand-discord" className="h-3.5 w-3.5" />
                {t("PRICING.DISCORD")}
              </a>
            )}
          </div>
        )}

        {topUpOptions.length > 0 && plans.length > 0 && (
          <div className="border-border/50 mx-auto mb-12 max-w-2xl border-t pt-10 text-center">
            <h2 className="text-foreground font-mono text-sm font-bold tracking-wide">
              {t("PRICING.BRIDGE.TITLE")}
            </h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md font-mono text-xs leading-relaxed">
              {t("PRICING.BRIDGE.DESC")}
            </p>
            <Icon
              name="chevron-down"
              className="mx-auto mt-4 h-5 w-5 animate-bounce text-emerald-500/70"
            />
          </div>
        )}

        {plans.length > 0 && (
          <p className="mb-6 text-center font-mono text-[10px] tracking-[0.2em] text-emerald-700 uppercase dark:text-emerald-400">
            {t("PRICING.PLANS.STEP")}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const tierKey = `PRICING.TIER.${i + 1}` as TranslationKey;
            const name = t.has(tierKey) ? t(tierKey) : plan.title;

            return (
              <PricingCard
                key={plan.id}
                name={name}
                price={plan.priceAmount}
                value={plan.estimatedTotalUsd}
                deliveryLabel={deliveryLabelFor(plan)}
                popular={i === 1}
                features={buildFeatures()}
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
