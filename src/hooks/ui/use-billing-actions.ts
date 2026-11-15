"use client";

import { useTopUpInfoQuery } from "@/hooks/billing/billing-hook";
import { useApiMutation } from "@/lib/react-query/hooks";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { SubscriptionPlanDTO } from "@/openapi";
import { paymentMethodAtom, type PaymentMethod } from "@/store/client-store";
import { useAtom } from "jotai";
import { useEffect } from "react";

type SubscribeOptions = {
  onUnauthorized?: () => void;
  isLoggedIn?: boolean;
};

const core = rpc.api.billing.core;

// Same tab on purpose: this runs after the mutation resolves, outside the
// click gesture, and mobile browsers silently block window.open there. The
// checkout was created and nothing opened; one user reached 67 pending orders.
function openPayLink(url: string | undefined) {
  if (url) window.location.assign(url);
}

function useCheckoutMutation() {
  return useApiMutation({
    mutationFn: (start: () => Promise<string | undefined>) => start(),
    onSuccess: openPayLink,
  });
}

export function useBillingActions() {
  const topUpInfoQuery = useTopUpInfoQuery();
  const subMutation = useCheckoutMutation();
  const topUpMutation = useCheckoutMutation();
  const [paymentMethod, setPaymentMethod] = useAtom(paymentMethodAtom);

  const topUpInfo = topUpInfoQuery.data;
  const enableStripe = topUpInfo?.enable_stripe_topup ?? false;
  const enableCreem = topUpInfo?.enable_creem_topup ?? false;
  const enableNowPayments = topUpInfo?.enable_nowpayments_topup ?? false;
  const enableDeloPay = topUpInfo?.enable_delopay_topup ?? false;
  const enableCard = enableStripe || enableCreem;
  const enableCrypto = enableNowPayments;
  // Hidden for now; DeloPay stays on upstream so in-flight PayPal webhooks still credit.
  const enablePayPal = false;
  const discount = topUpInfo?.discount ?? {};
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

  // The stored choice can outlive its provider being switched off upstream, so
  // fall back to the first one still offered.
  const firstAvailable = availableMethods[0];
  const methodOffered = availableMethods.includes(paymentMethod);
  useEffect(() => {
    if (!topUpInfo || methodOffered || !firstAvailable) return;
    setPaymentMethod(firstAvailable);
  }, [topUpInfo, methodOffered, firstAvailable, setPaymentMethod]);

  function discountFactor(amount: number): number | undefined {
    return discount[String(amount)];
  }

  function discountedAmount(amount: number): number {
    const factor = discountFactor(amount);
    return factor ? Math.round(amount * factor * 100) / 100 : amount;
  }

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

  function subscribe(plan: SubscriptionPlanDTO, opts?: SubscribeOptions) {
    if (opts?.isLoggedIn === false) return opts.onUnauthorized?.();
    const body = { plan_id: plan.plan.id };
    const sub = core.subscription;
    const crypto =
      enableNowPayments &&
      (paymentMethod === "crypto" || (!enableStripe && !enableCreem));
    if (paymentMethod === "paypal" && enableDeloPay)
      subMutation.mutate(
        async () => handleElysia(await sub["delopay-pay"].post(body)).pay_link,
      );
    else if (crypto)
      subMutation.mutate(
        async () =>
          handleElysia(await sub["nowpayments-pay"].post(body)).pay_link,
      );
    else if (enableStripe)
      subMutation.mutate(
        async () => handleElysia(await sub["stripe-pay"].post(body)).pay_link,
      );
    else if (enableCreem)
      subMutation.mutate(
        async () =>
          handleElysia(await sub["creem-pay"].post(body)).checkout_url,
      );
    else opts?.onUnauthorized?.();
  }

  function payStripe(amount: number) {
    const returnUrl = new URL(window.location.href);
    returnUrl.hash = "";
    const cancel_url = returnUrl.toString();
    returnUrl.searchParams.set("topup", "success");
    const success_url = returnUrl.toString();
    topUpMutation.mutate(
      async () =>
        handleElysia(
          await core["stripe-pay"].post({
            amount,
            payment_method: "stripe",
            success_url,
            cancel_url,
          }),
        ).pay_link,
    );
  }

  function payCreem(productId: string, amount?: number, custom?: boolean) {
    topUpMutation.mutate(
      async () =>
        handleElysia(
          await core["creem-pay"].post({
            product_id: productId,
            payment_method: "creem",
            ...(custom && amount ? { amount } : {}),
          }),
        ).checkout_url,
    );
  }

  function payNowPayments(amount: number) {
    topUpMutation.mutate(
      async () =>
        handleElysia(
          await core["nowpayments-pay"].post({
            amount,
            payment_method: "nowpayments",
          }),
        ).pay_link,
    );
  }

  function payDeloPay(amount: number) {
    topUpMutation.mutate(
      async () =>
        handleElysia(
          await core["delopay-pay"].post({ amount, payment_method: "delopay" }),
        ).pay_link,
    );
  }

  return {
    topUpInfo,
    enableStripe,
    enableCreem,
    enableNowPayments,
    enableDeloPay,
    enableCard,
    deloPayMinTopUp,
    availableMethods,
    paymentMethod,
    setPaymentMethod,
    isSubMutating: subMutation.isPending,
    isTopUpMutating: topUpMutation.isPending,
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
