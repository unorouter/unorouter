"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useTopUpInfoQuery() {
  return useQuery({
    queryKey: queryKeys.topUpInfo(),
    queryFn: async () =>
      handleElysia(await rpc.api.billing["topup-info"].get()),
  });
}

export function useBillingPlansQuery() {
  return useQuery({
    queryKey: queryKeys.billingPlans(),
    queryFn: async () =>
      handleElysia(await rpc.api.billing["subscription-plans"].get()),
  });
}

export function useSubscriptionSelfQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptionSelf(),
    queryFn: async () =>
      handleElysia(await rpc.api.billing["subscription-self"].get()),
  });
}

export function useUpdateBillingPreferenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (billingPreference: string) =>
      handleElysia(
        await rpc.api.billing["subscription-preference"].put({
          billing_preference: billingPreference,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionSelf() });
    },
  });
}

export function useStripeTopUpMutation() {
  return useMutation({
    mutationFn: async (amount: number) =>
      handleElysia(
        await rpc.api.billing["stripe-pay"].post({
          amount,
          payment_method: "stripe",
        }),
      ),
  });
}

export function useCreemTopUpMutation() {
  return useMutation({
    mutationFn: async (productId: string) =>
      handleElysia(
        await rpc.api.billing["creem-pay"].post({
          product_id: productId,
          payment_method: "creem",
        }),
      ),
  });
}

export function useStripeSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: number) =>
      handleElysia(
        await rpc.api.billing.subscription["stripe-pay"].post({
          plan_id: planId,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionSelf() });
    },
  });
}

export function useCreemSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: number) =>
      handleElysia(
        await rpc.api.billing.subscription["creem-pay"].post({
          plan_id: planId,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionSelf() });
    },
  });
}
