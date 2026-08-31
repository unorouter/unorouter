"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenQuery } from "@/lib/types/eden";
import { handleElysia, safeJsonParse } from "@/lib/utils/base";
import type { SubscriptionSelfData } from "@/openapi";

type Billing = typeof rpc.api.billing.core;

export function useTopUpInfoQuery() {
  return useElysiaQuery(
    queryKeys.topUpInfo(),
    () => rpc.api.billing.core["topup-info"].get(),
    {
      staleTime: "static",
      select: (data) => ({
        ...data,
        creemProducts: safeJsonParse<
          { productId: string; name: string; price: number; currency: string }[]
        >(data.creem_products, []),
      }),
    },
  );
}

export function useBillingPlansQuery() {
  // staleTime "static": server-dehydrated dataset that must not refetch on
  // mount. Static queries are skipped by invalidate/refetchQueries; use
  // queryClient.fetchQuery to force-update.
  return useElysiaQuery(
    queryKeys.billingPlans(),
    () => rpc.api.billing.core["subscription-plans"].get(),
    { staleTime: "static" },
  );
}

export function useSubscriptionSelfQuery() {
  const isLoggedIn = !!useAuthQuery().data;
  return useElysiaQuery(
    queryKeys.subscriptionSelf(),
    () => rpc.api.billing.core["subscription-self"].get(),
    { enabled: isLoggedIn },
  );
}

export function useUpdateBillingPreferenceMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription-preference"], "put">,
    ) =>
      handleElysia(
        await rpc.api.billing.core["subscription-preference"].put(args.body),
      ),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<SubscriptionSelfData>(
        queryKeys.subscriptionSelf(),
        (old) =>
          old
            ? { ...old, billing_preference: args.body.billing_preference }
            : old,
      );
    },
  });
}

export function useStripeTopUpMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<Billing["stripe-pay"], "post">) =>
      handleElysia(await rpc.api.billing.core["stripe-pay"].post(args.body)),
  });
}

export function useCreemTopUpMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<Billing["creem-pay"], "post">) =>
      handleElysia(await rpc.api.billing.core["creem-pay"].post(args.body)),
  });
}

export function useNowPaymentsTopUpMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<Billing["nowpayments-pay"], "post">) =>
      handleElysia(
        await rpc.api.billing.core["nowpayments-pay"].post(args.body),
      ),
  });
}

export function useDeloPayTopUpMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<Billing["delopay-pay"], "post">) =>
      handleElysia(await rpc.api.billing.core["delopay-pay"].post(args.body)),
  });
}

export function useStripeSubscriptionMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription"]["stripe-pay"], "post">,
    ) =>
      handleElysia(
        await rpc.api.billing.core.subscription["stripe-pay"].post(args.body),
      ),
  });
}

export function useCreemSubscriptionMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription"]["creem-pay"], "post">,
    ) =>
      handleElysia(
        await rpc.api.billing.core.subscription["creem-pay"].post(args.body),
      ),
  });
}

export function useNowPaymentsSubscriptionMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription"]["nowpayments-pay"], "post">,
    ) =>
      handleElysia(
        await rpc.api.billing.core.subscription["nowpayments-pay"].post(
          args.body,
        ),
      ),
  });
}

export function useDeloPaySubscriptionMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<Billing["subscription"]["delopay-pay"], "post">,
    ) =>
      handleElysia(
        await rpc.api.billing.core.subscription["delopay-pay"].post(args.body),
      ),
  });
}

export function useBillingPortalMutation() {
  return useApiMutation({
    mutationFn: async (query?: EdenQuery<typeof rpc.api.billing.core.portal>) =>
      handleElysia(await rpc.api.billing.core.portal.get({ query })),
  });
}

export function useTopUpHistoryQuery(
  query?: EdenQuery<typeof rpc.api.billing.core.transactions.topups>,
) {
  const isLoggedIn = !!useAuthQuery().data;
  return useElysiaQuery(
    queryKeys.topUpHistory(query),
    () => rpc.api.billing.core.transactions.topups.get({ query }),
    { enabled: isLoggedIn },
  );
}

export function useSubscriptionOrdersQuery(
  query?: EdenQuery<typeof rpc.api.billing.core.transactions.orders>,
) {
  const isLoggedIn = !!useAuthQuery().data;
  return useElysiaQuery(
    queryKeys.subscriptionOrders(query),
    () => rpc.api.billing.core.transactions.orders.get({ query }),
    { enabled: isLoggedIn },
  );
}

// Redeeming a gift card credits the caller's balance upstream, so both the
// cached balance and the top-up history are stale afterwards.
export function useRedeemMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<Billing["redeem"], "post">) =>
      handleElysia(await rpc.api.billing.core.redeem.post(args.body)),
    invalidates: [queryKeys.auth(), queryKeys.topUpHistory()],
  });
}
