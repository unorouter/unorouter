import { Home } from "@/components/pages/home/home";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

export default async function HomePage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.newApi.pricing(),
      queryFn: async () => handleElysia(await rpc.api.pricing.get())
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.stats.history(),
      queryFn: async () => handleElysia(await rpc.api.stats.history.get())
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.newApi.subscriptionPlans(),
      queryFn: async () => handleElysia(await rpc.api.subscription.plans.get())
    })
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Home />
    </HydrationBoundary>
  );
}
