"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type { ResponseControllerSubscriptionSelfDataData } from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const billing = rpc.api.billing;

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
    mutationFn: async (
      args: EdenArgs<(typeof billing)["subscription-preference"], "put">,
    ) =>
      handleElysia(
        await rpc.api.billing["subscription-preference"].put(args.body),
      ),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseControllerSubscriptionSelfDataData>(
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
  return useMutation({
    mutationFn: async (
      args: EdenArgs<(typeof billing)["stripe-pay"], "post">,
    ) => handleElysia(await rpc.api.billing["stripe-pay"].post(args.body)),
  });
}

export function useCreemTopUpMutation() {
  return useMutation({
    mutationFn: async (args: EdenArgs<(typeof billing)["creem-pay"], "post">) =>
      handleElysia(await rpc.api.billing["creem-pay"].post(args.body)),
  });
}

export function useStripeSubscriptionMutation() {
  return useMutation({
    mutationFn: async (
      args: EdenArgs<(typeof billing)["subscription"]["stripe-pay"], "post">,
    ) =>
      handleElysia(
        await rpc.api.billing.subscription["stripe-pay"].post(args.body),
      ),
  });
}

export function useCreemSubscriptionMutation() {
  return useMutation({
    mutationFn: async (
      args: EdenArgs<(typeof billing)["subscription"]["creem-pay"], "post">,
    ) =>
      handleElysia(
        await rpc.api.billing.subscription["creem-pay"].post(args.body),
      ),
  });
}
