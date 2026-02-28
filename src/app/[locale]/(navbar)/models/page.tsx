import { Models } from "@/components/pages/models/models";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

export default async function ModelsPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.newApi.pricing(),
    queryFn: async () => handleElysia(await rpc.api.pricing.get()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Models />
    </HydrationBoundary>
  );
}
