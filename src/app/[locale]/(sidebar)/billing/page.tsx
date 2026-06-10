import { prefetchElysia } from "@/lib/react-query/prefetch";
import { Billing } from "@/components/pages/sidebar/billing/billing";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function BillingPage() {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.topUpInfo(), () =>
      rpc.api.billing.core["topup-info"].get(cookieHeaders),
    ),
    prefetchElysia(queryClient, queryKeys.billingPlans(), () =>
      rpc.api.billing.core["subscription-plans"].get(cookieHeaders),
    ),
    prefetchElysia(queryClient, queryKeys.subscriptionSelf(), () =>
      rpc.api.billing.core["subscription-self"].get(cookieHeaders),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Billing />
    </HydrationBoundary>
  );
}
