"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function usePricingQuery(enabled = true) {
  // staleTime "static": this dataset is dehydrated into prerendered shells,
  // and any finite staleTime makes useQuery read the clock during the
  // prerender (rejected by cacheComponents). Static queries are skipped by
  // invalidate/refetchQueries; use queryClient.fetchQuery to force-update.
  return useElysiaQuery(
    queryKeys.pricing(),
    () => rpc.api.models.pricing.get(),
    { staleTime: "static", enabled },
  );
}

export function useModelDetailQuery(name: string | null) {
  return useElysiaQuery(
    queryKeys.pricingModel(name ?? ""),
    () => rpc.api.models.pricing.detail.get({ query: { model: name! } }),
    { enabled: name !== null },
  );
}
