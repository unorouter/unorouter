"use client";

import {
  useCreemSubscriptionMutation,
  useCreemTopUpMutation,
  useStripeSubscriptionMutation,
  useStripeTopUpMutation,
  useTopUpInfoQuery,
} from "@/hooks/billing-hook";
import { analytics } from "@/lib/analytics";
import type { SubscriptionPlan } from "@/lib/api/subscription";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type SubscribeOptions = {
  onUnauthorized?: () => void;
  isLoggedIn?: boolean;
};

// Stripe wins when both Stripe and Creem are enabled.
export function useBillingActions() {
  const t = useTranslations();
  const topUpInfoQuery = useTopUpInfoQuery();
  const stripeSubMutation = useStripeSubscriptionMutation();
  const creemSubMutation = useCreemSubscriptionMutation();
  const stripeTopUpMutation = useStripeTopUpMutation();
  const creemTopUpMutation = useCreemTopUpMutation();

  const topUpInfo = topUpInfoQuery.data;
  const enableStripe = topUpInfo?.enable_stripe_topup ?? false;
  const enableCreem = topUpInfo?.enable_creem_topup ?? false;
  const discount = topUpInfo?.discount ?? {};
  const isSubMutating =
    stripeSubMutation.isPending || creemSubMutation.isPending;
  const isTopUpMutating =
    stripeTopUpMutation.isPending || creemTopUpMutation.isPending;

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

  return {
    topUpInfo,
    enableStripe,
    enableCreem,
    isSubMutating,
    isTopUpMutating,
    subscribe,
    payStripe,
    payCreem,
    discountedAmount,
    discountSavings,
  };
}
