import { prefetchElysia } from "@/lib/react-query/prefetch";
import { Billing } from "@/components/pages/sidebar/billing/billing";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function BillingPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
      rpc.api.auth.account.self.get(cookies),
    ),
    prefetchElysia(queryClient, queryKeys.topUpInfo(), (cookies) =>
      rpc.api.billing.core["topup-info"].get(cookies),
    ),
    prefetchElysia(queryClient, queryKeys.billingPlans(), (cookies) =>
      rpc.api.billing.core["subscription-plans"].get(cookies),
    ),
    prefetchElysia(queryClient, queryKeys.subscriptionSelf(), (cookies) =>
      rpc.api.billing.core["subscription-self"].get(cookies),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Billing />
    </HydrationBoundary>
  );
}
