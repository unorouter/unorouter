"use client";

import { queryKeys } from "@/lib/react-query/keys";
import type { rpc } from "@/lib/rpc";
import { getRpc } from "@/lib/rpc-lazy";
import { handleElysia } from "@/lib/utils/base";
import type { EdenArgs } from "@/lib/types/eden";
import { safeJsonParse } from "@/lib/utils/base";
import { handleError, useSimpleMutation } from "@/lib/utils/client";
import type { ResponseControllerSubscriptionSelfDataData } from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type Billing = typeof rpc.api.billing;

export function useTopUpInfoQuery() {
  return useQuery({
    queryKey: queryKeys.topUpInfo(),
    queryFn: async () => {
      const rpc = await getRpc();
      return handleElysia(await rpc.api.billing["topup-info"].get());
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
      const rpc = await getRpc();
      return handleElysia(await rpc.api.billing["subscription-plans"].get());
    },
  });
}

export function useSubscriptionSelfQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptionSelf(),
    queryFn: async () => {
      const rpc = await getRpc();
      return handleElysia(await rpc.api.billing["subscription-self"].get());
    },
  });
}

export function useUpdateBillingPreferenceMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription-preference"], "put">,
    ) => {
      const rpc = await getRpc();
      return handleElysia(
        await rpc.api.billing["subscription-preference"].put(args.body),
      );
    },
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
  return useSimpleMutation(
    async (args: EdenArgs<Billing["stripe-pay"], "post">) => {
      const rpc = await getRpc();
      return handleElysia(await rpc.api.billing["stripe-pay"].post(args.body));
    },
  );
}

export function useCreemTopUpMutation() {
  return useSimpleMutation(
    async (args: EdenArgs<Billing["creem-pay"], "post">) => {
      const rpc = await getRpc();
      return handleElysia(await rpc.api.billing["creem-pay"].post(args.body));
    },
  );
}

export function useStripeSubscriptionMutation() {
  return useSimpleMutation(
    async (
      args: EdenArgs<Billing["subscription"]["stripe-pay"], "post">,
    ) => {
      const rpc = await getRpc();
      return handleElysia(
        await rpc.api.billing.subscription["stripe-pay"].post(args.body),
      );
    },
  );
}

export function useCreemSubscriptionMutation() {
  return useSimpleMutation(
    async (
      args: EdenArgs<Billing["subscription"]["creem-pay"], "post">,
    ) => {
      const rpc = await getRpc();
      return handleElysia(
        await rpc.api.billing.subscription["creem-pay"].post(args.body),
      );
    },
  );
}
