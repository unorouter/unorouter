import { Pricing } from "@/components/pages/pricing/pricing";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

export default async function PricingPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: async () => handleElysia(await rpc.api.subscription.plans.get()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Pricing />
    </HydrationBoundary>
  );
}
