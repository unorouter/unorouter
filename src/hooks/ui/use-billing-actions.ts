"use client";

import {
  useCreemSubscriptionMutation,
  useCreemTopUpMutation,
  useNowPaymentsSubscriptionMutation,
  useNowPaymentsTopUpMutation,
  useStripeSubscriptionMutation,
  useStripeTopUpMutation,
  useTopUpInfoQuery,
} from "@/hooks/billing/billing-hook";
import { analytics } from "@/lib/analytics";
import type { SubscriptionPlan } from "@/lib/api/subscription";
import { paymentMethodAtom, type PaymentMethod } from "@/store/client-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

type SubscribeOptions = {
  onUnauthorized?: () => void;
  isLoggedIn?: boolean;
};

// Routes payments through paymentMethodAtom (card vs crypto). Card prefers
// Stripe over Creem when both are enabled. Crypto goes to NowPayments.
export function useBillingActions() {
  const t = useTranslations();
  const topUpInfoQuery = useTopUpInfoQuery();
  const stripeSubMutation = useStripeSubscriptionMutation();
  const creemSubMutation = useCreemSubscriptionMutation();
  const nowPaymentsSubMutation = useNowPaymentsSubscriptionMutation();
  const stripeTopUpMutation = useStripeTopUpMutation();
  const creemTopUpMutation = useCreemTopUpMutation();
  const nowPaymentsTopUpMutation = useNowPaymentsTopUpMutation();
  const [paymentMethod, setPaymentMethod] = useAtom(paymentMethodAtom);

  const topUpInfo = topUpInfoQuery.data;
  const enableStripe = topUpInfo?.enable_stripe_topup ?? false;
  const enableCreem = topUpInfo?.enable_creem_topup ?? false;
  const enableNowPayments = topUpInfo?.enable_nowpayments_topup ?? false;
  const enableCard = enableStripe || enableCreem;
  const enableCrypto = enableNowPayments;
  const discount = topUpInfo?.discount ?? {};

  const availableMethods: PaymentMethod[] = [];
  if (enableCard) availableMethods.push("card");
  if (enableCrypto) availableMethods.push("crypto");

  const isSubMutating =
    stripeSubMutation.isPending ||
    creemSubMutation.isPending ||
    nowPaymentsSubMutation.isPending;
  const isTopUpMutating =
    stripeTopUpMutation.isPending ||
    creemTopUpMutation.isPending ||
    nowPaymentsTopUpMutation.isPending;

  // Auto-flip atom when the selected method is unavailable. Runs once when
  // topupInfo lands and the persisted choice no longer matches reality.
  useEffect(() => {
    if (!topUpInfo) return;
    if (paymentMethod === "card" && !enableCard && enableCrypto) {
      setPaymentMethod("crypto");
    } else if (paymentMethod === "crypto" && !enableCrypto && enableCard) {
      setPaymentMethod("card");
    }
  }, [topUpInfo, paymentMethod, enableCard, enableCrypto, setPaymentMethod]);

  function discountFactor(amount: number): number | undefined {
    return discount[String(amount)];
  }

  function discountedAmount(amount: number): number {
    const factor = discountFactor(amount);
    return factor ? Math.round(amount * factor * 100) / 100 : amount;
  }

  function discountSavings(amount: number): number {
    return Math.round((amount - discountedAmount(amount)) * 100) / 100;
  }

  function failToast() {
    toast.error(t("BILLING.ERROR.PAYMENT_FAILED"));
  }

  function openPayLink(url: string | undefined) {
    if (url) window.open(url, "_blank");
  }

  function subscribe(plan: SubscriptionPlan, opts?: SubscribeOptions) {
    if (opts?.isLoggedIn === false) {
      opts.onUnauthorized?.();
      return;
    }

    if (paymentMethod === "crypto" && enableNowPayments) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.id),
        provider: "nowpayments",
        provider_was_only_option: !enableCard,
      });
      nowPaymentsSubMutation.mutate(
        { body: { plan_id: plan.id } },
        {
          onSuccess: (data) => {
            if (data?.pay_link) {
              openPayLink(data.pay_link);
            } else {
              // NowPayments email-subscription flow has no checkout URL (invoice is emailed); confirm so the click isn't a silent no-op.
              toast.success(t("BILLING.SUBSCRIPTION.CRYPTO_EMAIL_SENT"));
            }
          },
          onError: failToast,
        },
      );
      return;
    }

    const onlyStripe = enableStripe && !enableCreem;
    const onlyCreem = enableCreem && !enableStripe;
    if (enableStripe) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.id),
        provider: "stripe",
        provider_was_only_option: onlyStripe,
      });
      stripeSubMutation.mutate(
        { body: { plan_id: plan.id } },
        {
          onSuccess: (data) => openPayLink(data?.pay_link),
          onError: failToast,
        },
      );
      return;
    }
    if (enableCreem) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.id),
        provider: "creem",
        provider_was_only_option: onlyCreem,
      });
      creemSubMutation.mutate(
        { body: { plan_id: plan.id } },
        {
          onSuccess: (data) => openPayLink(data?.checkout_url),
          onError: failToast,
        },
      );
      return;
    }
    if (enableNowPayments) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.id),
        provider: "nowpayments",
        provider_was_only_option: true,
      });
      nowPaymentsSubMutation.mutate(
        { body: { plan_id: plan.id } },
        {
          onSuccess: (data) => openPayLink(data?.pay_link),
          onError: failToast,
        },
      );
      return;
    }
    opts?.onUnauthorized?.();
  }

  function payStripe(amount: number) {
    const factor = discountFactor(amount);
    analytics.billing.topUpInitiated({
      provider: "stripe",
      amount,
      has_discount: !!factor,
      discount_pct: factor ? Math.round((1 - factor) * 100) : undefined,
    });
    stripeTopUpMutation.mutate(
      { body: { amount, payment_method: "stripe" } },
      {
        onSuccess: (data) => openPayLink(data?.pay_link),
        onError: failToast,
      },
    );
  }

  function payCreem(productId: string, amount?: number) {
    analytics.billing.topUpInitiated({ provider: "creem", amount });
    creemTopUpMutation.mutate(
      { body: { product_id: productId, payment_method: "creem" } },
      {
        onSuccess: (data) => openPayLink(data?.checkout_url),
        onError: failToast,
      },
    );
  }

  function payNowPayments(amount: number) {
    const factor = discountFactor(amount);
    analytics.billing.topUpInitiated({
      provider: "nowpayments",
      amount,
      has_discount: !!factor,
      discount_pct: factor ? Math.round((1 - factor) * 100) : undefined,
    });
    nowPaymentsTopUpMutation.mutate(
      { body: { amount, payment_method: "nowpayments" } },
      {
        onSuccess: (data) => openPayLink(data?.pay_link),
        onError: failToast,
      },
    );
  }

  return {
    topUpInfo,
    enableStripe,
    enableCreem,
    enableNowPayments,
    enableCard,
    enableCrypto,
    availableMethods,
    paymentMethod,
    setPaymentMethod,
    isSubMutating,
    isTopUpMutating,
    subscribe,
    payStripe,
    payCreem,
    payNowPayments,
    discountedAmount,
    discountSavings,
  };
}
