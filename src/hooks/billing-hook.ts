"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia, safeJsonParse } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import type { ResponseControllerSubscriptionSelfDataData } from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

const _billing = rpc.api.billing;

export function useTopUpInfoQuery() {
  return useQuery({
    queryKey: queryKeys.topUpInfo(),
    queryFn: async () =>
      handleElysia(await rpc.api.billing["topup-info"].get()),
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
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<(typeof _billing)["subscription-preference"], "put">,
    ) =>
      handleElysia(
        await rpc.api.billing["subscription-preference"].put(args.body),
      ),
    onError: (e) => handleError(e, t),
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
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<(typeof _billing)["stripe-pay"], "post">,
    ) => handleElysia(await rpc.api.billing["stripe-pay"].post(args.body)),
    onError: (e) => handleError(e, t),
  });
}

export function useCreemTopUpMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<(typeof _billing)["creem-pay"], "post">,
    ) => handleElysia(await rpc.api.billing["creem-pay"].post(args.body)),
    onError: (e) => handleError(e, t),
  });
}

export function useStripeSubscriptionMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<(typeof _billing)["subscription"]["stripe-pay"], "post">,
    ) =>
      handleElysia(
        await rpc.api.billing.subscription["stripe-pay"].post(args.body),
      ),
    onError: (e) => handleError(e, t),
  });
}

export function useCreemSubscriptionMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<(typeof _billing)["subscription"]["creem-pay"], "post">,
    ) =>
      handleElysia(
        await rpc.api.billing.subscription["creem-pay"].post(args.body),
      ),
    onError: (e) => handleError(e, t),
  });
}
