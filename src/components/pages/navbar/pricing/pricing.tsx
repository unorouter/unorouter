"use client";

import { PageHeader } from "@/components/elements/content/page-header";
import { PricingCard } from "@/components/elements/content/pricing-card";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useCreemTopUpMutation,
  useStripeTopUpMutation,
  useTopUpInfoQuery,
} from "@/hooks/billing-hook";
import { useSubscriptionPlansQuery } from "@/hooks/subscription-hook";
import { useRouter } from "@/i18n/navigation";
import { RESET_TRANSLATION_KEYS, getMultiplier } from "@/lib/api/subscription";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useTranslations } from "next-intl";
import { LuZap } from "react-icons/lu";
import { toast } from "sonner";

type TopUpOption = {
  key: string;
  amount: number;
  handler: () => void;
};

export function Pricing() {
  const t = useTranslations();
  const router = useRouter();
  const authQuery = useAuthQuery();
  const { data } = useSubscriptionPlansQuery();
  const topUpInfoQuery = useTopUpInfoQuery();
  const stripeTopUpMutation = useStripeTopUpMutation();
  const creemTopUpMutation = useCreemTopUpMutation();
  const plans = data ?? [];
  const isLoggedIn = !!authQuery.data;
  const topUpInfo = topUpInfoQuery.data;
  const isTopUpMutating =
    stripeTopUpMutation.isPending || creemTopUpMutation.isPending;

  function handleSubscribe() {
    if (isLoggedIn) {
      router.push("/billing");
    } else {
      setCookie(AUTH_REDIRECT_COOKIE, "/billing", { maxAge: 300 });
      router.push("/login");
    }
  }

  function redirectToLogin() {
    setCookie(AUTH_REDIRECT_COOKIE, "/billing", { maxAge: 300 });
    router.push("/login");
  }

  function payWithStripe(amount: number) {
    stripeTopUpMutation.mutate(
      { body: { amount, payment_method: "stripe" } },
      {
        onSuccess: (response) => {
          if (response.pay_link) window.open(response.pay_link, "_blank");
        },
        onError: () => toast.error(t("BILLING.ERROR.PAYMENT_FAILED")),
      },
    );
  }

  function payWithCreem(productId: string) {
    creemTopUpMutation.mutate(
      { body: { product_id: productId, payment_method: "creem" } },
      {
        onSuccess: (response) => {
          if (response.checkout_url)
            window.open(response.checkout_url, "_blank");
        },
        onError: () => toast.error(t("BILLING.ERROR.PAYMENT_FAILED")),
      },
    );
  }

  function buildTopUpOptions(): TopUpOption[] {
    if (!topUpInfo) return [];

    const enableStripe = topUpInfo.enable_stripe_topup ?? false;
    const enableCreem = topUpInfo.enable_creem_topup ?? false;

    if (enableCreem && topUpInfo.creemProducts.length > 0) {
      return topUpInfo.creemProducts.map((product) => ({
        key: product.productId,
        amount: product.price,
        handler: isLoggedIn
          ? () => payWithCreem(product.productId)
          : redirectToLogin,
      }));
    }

    if (enableStripe && topUpInfo.amount_options.length > 0) {
      return topUpInfo.amount_options.map((amount) => ({
        key: `stripe-${amount}`,
        amount,
        handler: isLoggedIn ? () => payWithStripe(amount) : redirectToLogin,
      }));
    }

    if (enableStripe) {
      return [5, 10, 20, 50, 100].map((amount) => ({
        key: `stripe-${amount}`,
        amount,
        handler: isLoggedIn ? () => payWithStripe(amount) : redirectToLogin,
      }));
    }

    return [];
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

  const topUpOptions = buildTopUpOptions();

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

        {topUpOptions.length > 0 && (
          <div className="border-border/50 mx-auto max-w-2xl border-t pt-10">
            <div className="mb-4 text-center">
              <h3 className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("PRICING.TOPUP.LABEL")}
              </h3>
              <p className="text-foreground mt-2 font-mono text-xs">
                {t("PRICING.TOPUP.DESC")}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {topUpOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={option.handler}
                  disabled={isTopUpMutating}
                  className="border-border hover:border-foreground/50 text-foreground flex cursor-pointer items-center justify-center border px-3 py-2.5 font-mono text-sm font-bold tabular-nums transition-colors disabled:opacity-50"
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
      </div>
    </section>
  );
}
