import { Billing } from "@/components/pages/sidebar/billing/billing";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function BillingPage() {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.topUpInfo(),
      queryFn: async () =>
        handleElysia(
          await rpc.api.billing.core["topup-info"].get(cookieHeaders),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.billingPlans(),
      queryFn: async () =>
        handleElysia(
          await rpc.api.billing.core["subscription-plans"].get(cookieHeaders),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptionSelf(),
      queryFn: async () =>
        handleElysia(
          await rpc.api.billing.core["subscription-self"].get(cookieHeaders),
        ),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Billing />
    </HydrationBoundary>
  );
}
