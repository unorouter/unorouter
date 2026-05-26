"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia, safeJsonParse } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import type { SubscriptionSelfData } from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type Billing = typeof rpc.api.billing.core;

export function useTopUpInfoQuery() {
  return useQuery({
    queryKey: queryKeys.topUpInfo(),
    queryFn: async () => {
      return handleElysia(await rpc.api.billing.core["topup-info"].get());
    },
    select: (data) => ({
      ...data,
      creemProducts: safeJsonParse<
        { productId: string; name: string; price: number; currency: string }[]
      >(data.creem_products, []),
    }),
  });
}

export function useBillingPlansQuery() {
  return useQuery({
    queryKey: queryKeys.billingPlans(),
    queryFn: async () => {
      return handleElysia(
        await rpc.api.billing.core["subscription-plans"].get(),
      );
    },
  });
}

export function useSubscriptionSelfQuery() {
  const isLoggedIn = !!useAuthQuery().data;
  return useQuery({
    queryKey: queryKeys.subscriptionSelf(),
    queryFn: async () => {
      return handleElysia(
        await rpc.api.billing.core["subscription-self"].get(),
      );
    },
    enabled: isLoggedIn,
  });
}

export function useUpdateBillingPreferenceMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription-preference"], "put">,
    ) => {
      return handleElysia(
        await rpc.api.billing.core["subscription-preference"].put(args.body),
      );
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<SubscriptionSelfData>(
        queryKeys.subscriptionSelf(),
        (old) =>
          old
            ? {
                ...old,
                billing_preference: args.body.billing_preference,
              }
            : old,
      );
    },
  });
}

export function useStripeTopUpMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: EdenArgs<Billing["stripe-pay"], "post">) => {
      return handleElysia(
        await rpc.api.billing.core["stripe-pay"].post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useCreemTopUpMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: EdenArgs<Billing["creem-pay"], "post">) => {
      return handleElysia(
        await rpc.api.billing.core["creem-pay"].post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useNowPaymentsTopUpMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: EdenArgs<Billing["nowpayments-pay"], "post">) => {
      return handleElysia(
        await rpc.api.billing.core["nowpayments-pay"].post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useStripeSubscriptionMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription"]["stripe-pay"], "post">,
    ) => {
      return handleElysia(
        await rpc.api.billing.core.subscription["stripe-pay"].post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useCreemSubscriptionMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription"]["creem-pay"], "post">,
    ) => {
      return handleElysia(
        await rpc.api.billing.core.subscription["creem-pay"].post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useNowPaymentsSubscriptionMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription"]["nowpayments-pay"], "post">,
    ) => {
      return handleElysia(
        await rpc.api.billing.core.subscription["nowpayments-pay"].post(
          args.body,
        ),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useBillingPortalMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async () => {
      return handleElysia(await rpc.api.billing.core.portal.get());
    },
    onError: (e) => handleError(e, t),
  });
}
