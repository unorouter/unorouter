import { prefetchElysia } from "@/lib/react-query/prefetch";
import { Billing } from "@/components/pages/sidebar/billing/billing";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { burnRateWindow } from "@/store/dashboard-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function BillingPage() {
  const queryClient = getQueryClient();
  const burn = burnRateWindow();

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
      rpc.api.auth.account.self.get(cookies),
    ),
    // The days-left estimate reads the same day-aligned 7-day quota window the
    // dashboard prefetches; without this the tile fetches client-side.
    prefetchElysia(queryClient, queryKeys.dashboardQuota(burn), (cookies) =>
      rpc.api.billing.dashboard.quota.get({ ...cookies, query: burn }),
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
