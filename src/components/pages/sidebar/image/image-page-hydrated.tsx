import { ImagePage } from "@/components/pages/sidebar/image/image-page";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export async function ImagePageHydrated() {
  const queryClient = getQueryClient();
  await prefetchElysia(queryClient, queryKeys.pricingImageModels(), () =>
    rpc.api.models.pricing["image-models"].get(),
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ImagePage />
    </HydrationBoundary>
  );
}
