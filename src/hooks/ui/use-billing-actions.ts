"use client";

import {
  useCreemSubscriptionMutation,
  useCreemTopUpMutation,
  useDeloPaySubscriptionMutation,
  useDeloPayTopUpMutation,
  useNowPaymentsSubscriptionMutation,
  useNowPaymentsTopUpMutation,
  useStripeSubscriptionMutation,
  useStripeTopUpMutation,
  useTopUpInfoQuery,
} from "@/hooks/billing/billing-hook";
import { analytics } from "@/lib/analytics";
import type { SubscriptionPlanDTO } from "@/openapi";
import { paymentMethodAtom, type PaymentMethod } from "@/store/client-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

type SubscribeOptions = {
  onUnauthorized?: () => void;
  isLoggedIn?: boolean;
};

export function useBillingActions() {
  const t = useTranslations();
  const topUpInfoQuery = useTopUpInfoQuery();
  const stripeSubMutation = useStripeSubscriptionMutation();
  const creemSubMutation = useCreemSubscriptionMutation();
  const nowPaymentsSubMutation = useNowPaymentsSubscriptionMutation();
  const deloPaySubMutation = useDeloPaySubscriptionMutation();
  const stripeTopUpMutation = useStripeTopUpMutation();
  const creemTopUpMutation = useCreemTopUpMutation();
  const nowPaymentsTopUpMutation = useNowPaymentsTopUpMutation();
  const deloPayTopUpMutation = useDeloPayTopUpMutation();
  const [paymentMethod, setPaymentMethod] = useAtom(paymentMethodAtom);

  const topUpInfo = topUpInfoQuery.data;
  const enableStripe = topUpInfo?.enable_stripe_topup ?? false;
  const enableCreem = topUpInfo?.enable_creem_topup ?? false;
  const enableNowPayments = topUpInfo?.enable_nowpayments_topup ?? false;
  const enableDeloPay = topUpInfo?.enable_delopay_topup ?? false;
  const enableCard = enableStripe || enableCreem;
  const enableCrypto = enableNowPayments;
  const enablePayPal = enableDeloPay;
  const discount = topUpInfo?.discount ?? {};
  // PayPal's fixed per-transaction fee makes the smallest tiers a loss, so
  // upstream enforces a floor and REJECTS amounts below it at the pay call.
  const deloPayMinTopUp = topUpInfo?.delopay_min_topup || 1;
  const deloPayFeeFixed = topUpInfo?.delopay_fee_fixed ?? 0;
  const deloPayFeePercent = topUpInfo?.delopay_fee_percent ?? 0;
  const deloPayFeeThreshold = topUpInfo?.delopay_fee_threshold ?? 0;
  const creemFeeFixed = topUpInfo?.creem_fee_fixed ?? 0;
  const creemFeePercent = topUpInfo?.creem_fee_percent ?? 0;
  const creemFeeThreshold = topUpInfo?.creem_fee_threshold ?? 0;

  const availableMethods: PaymentMethod[] = [];
  if (enableCard) availableMethods.push("card");
  if (enablePayPal) availableMethods.push("paypal");
  if (enableCrypto) availableMethods.push("crypto");

  const isSubMutating =
    stripeSubMutation.isPending ||
    creemSubMutation.isPending ||
    nowPaymentsSubMutation.isPending ||
    deloPaySubMutation.isPending;
  const isTopUpMutating =
    stripeTopUpMutation.isPending ||
    creemTopUpMutation.isPending ||
    nowPaymentsTopUpMutation.isPending ||
    deloPayTopUpMutation.isPending;

  useEffect(() => {
    if (!topUpInfo) return;
    const enabled =
      (paymentMethod === "card" && enableCard) ||
      (paymentMethod === "crypto" && enableCrypto) ||
      (paymentMethod === "paypal" && enablePayPal);
    if (enabled) return;
    const fallback: PaymentMethod | undefined = enableCard
      ? "card"
      : enablePayPal
        ? "paypal"
        : enableCrypto
          ? "crypto"
          : undefined;
    if (fallback) setPaymentMethod(fallback);
  }, [
    topUpInfo,
    paymentMethod,
    enableCard,
    enableCrypto,
    enablePayPal,
    setPaymentMethod,
  ]);

  function discountFactor(amount: number): number | undefined {
    return discount[String(amount)];
  }

  function discountedAmount(amount: number): number {
    const factor = discountFactor(amount);
    return factor ? Math.round(amount * factor * 100) / 100 : amount;
  }

  // Mirrors the gateway's surcharge helpers: the buyer covers the processing fee
  // on top of the credited amount, only up to the threshold, rounded UP to the
  // cent so a tile never understates the charge.
  function chargedWithFee(
    credited: number,
    fixed: number,
    percent: number,
    threshold: number,
  ): number {
    if (credited <= 0) return credited;
    if (threshold > 0 && credited > threshold) return credited;
    const billed = credited * (1 + percent) + fixed;
    return Math.max(credited, Math.ceil(billed * 100) / 100);
  }

  function deloPayChargedAmount(amount: number): number {
    return chargedWithFee(
      discountedAmount(amount),
      deloPayFeeFixed,
      deloPayFeePercent,
      deloPayFeeThreshold,
    );
  }

  // Creem applies its fee to a CUSTOM amount only; preset products keep the
  // price configured upstream.
  function creemChargedAmount(amount: number): number {
    return chargedWithFee(
      amount,
      creemFeeFixed,
      creemFeePercent,
      creemFeeThreshold,
    );
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

  function subscribe(plan: SubscriptionPlanDTO, opts?: SubscribeOptions) {
    if (opts?.isLoggedIn === false) {
      opts.onUnauthorized?.();
      return;
    }

    if (paymentMethod === "paypal" && enableDeloPay) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.plan.id),
        provider: "delopay",
        provider_was_only_option: !enableCard && !enableCrypto,
      });
      deloPaySubMutation.mutate(
        { body: { plan_id: plan.plan.id } },
        {
          onSuccess: (data) => openPayLink(data?.pay_link),
          onError: failToast,
        },
      );
      return;
    }

    if (paymentMethod === "crypto" && enableNowPayments) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.plan.id),
        provider: "nowpayments",
        provider_was_only_option: !enableCard,
      });
      nowPaymentsSubMutation.mutate(
        { body: { plan_id: plan.plan.id } },
        {
          onSuccess: (data) => {
            if (data?.pay_link) {
              openPayLink(data.pay_link);
            } else {
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
        planId: String(plan.plan.id),
        provider: "stripe",
        provider_was_only_option: onlyStripe,
      });
      stripeSubMutation.mutate(
        { body: { plan_id: plan.plan.id } },
        {
          onSuccess: (data) => openPayLink(data?.pay_link),
          onError: failToast,
        },
      );
      return;
    }
    if (enableCreem) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.plan.id),
        provider: "creem",
        provider_was_only_option: onlyCreem,
      });
      creemSubMutation.mutate(
        { body: { plan_id: plan.plan.id } },
        {
          onSuccess: (data) => openPayLink(data?.checkout_url),
          onError: failToast,
        },
      );
      return;
    }
    if (enableNowPayments) {
      analytics.billing.subscriptionInitiated({
        planId: String(plan.plan.id),
        provider: "nowpayments",
        provider_was_only_option: true,
      });
      nowPaymentsSubMutation.mutate(
        { body: { plan_id: plan.plan.id } },
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
    const returnUrl = new URL(window.location.href);
    returnUrl.hash = "";
    const cancelUrl = returnUrl.toString();
    returnUrl.searchParams.set("topup", "success");
    const successUrl = returnUrl.toString();
    stripeTopUpMutation.mutate(
      {
        body: {
          amount,
          payment_method: "stripe",
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      },
      {
        onSuccess: (data) => openPayLink(data?.pay_link),
        onError: failToast,
      },
    );
  }

  // custom: send the amount so upstream overrides the product price via Creem's
  // custom_price. Preset tiles omit it and charge the product's own price.
  function payCreem(productId: string, amount?: number, custom?: boolean) {
    analytics.billing.topUpInitiated({ provider: "creem", amount });
    creemTopUpMutation.mutate(
      {
        body: {
          product_id: productId,
          payment_method: "creem",
          ...(custom && amount ? { amount } : {}),
        },
      },
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

  function payDeloPay(amount: number) {
    const factor = discountFactor(amount);
    analytics.billing.topUpInitiated({
      provider: "delopay",
      amount,
      has_discount: !!factor,
      discount_pct: factor ? Math.round((1 - factor) * 100) : undefined,
    });
    deloPayTopUpMutation.mutate(
      { body: { amount, payment_method: "delopay" } },
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
    enableDeloPay,
    enableCard,
    enableCrypto,
    enablePayPal,
    deloPayMinTopUp,
    availableMethods,
    paymentMethod,
    setPaymentMethod,
    isSubMutating,
    isTopUpMutating,
    subscribe,
    payStripe,
    payCreem,
    payNowPayments,
    payDeloPay,
    discountedAmount,
    discountSavings,
    deloPayChargedAmount,
    creemChargedAmount,
  };
}
