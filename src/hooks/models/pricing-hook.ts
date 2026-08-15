"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function usePricingQuery(enabled = true) {
  // staleTime "static": server-dehydrated dataset that must not refetch on
  // mount. Static queries are skipped by invalidate/refetchQueries; use
  // queryClient.fetchQuery to force-update.
  return useElysiaQuery(
    queryKeys.pricing(),
    () => rpc.api.models.pricing.get(),
    { staleTime: "static", enabled },
  );
}

export function usePricingCountsQuery() {
  return useElysiaQuery(
    queryKeys.pricingCounts(),
    () => rpc.api.models.pricing.counts.get(),
    { staleTime: "static" },
  );
}

export function usePricingVendorsQuery(enabled = true) {
  return useElysiaQuery(
    queryKeys.pricingVendors(),
    () => rpc.api.models.pricing.vendors.get(),
    { staleTime: "static", enabled },
  );
}

export function useImageModelsQuery() {
  return useElysiaQuery(
    queryKeys.pricingImageModels(),
    () => rpc.api.models.pricing["image-models"].get(),
    { staleTime: "static" },
  );
}

export function usePricingVendorQuery(name: string) {
  return useElysiaQuery(
    queryKeys.pricingVendor(name),
    () => rpc.api.models.pricing.vendor.get({ query: { name } }),
    { staleTime: "static" },
  );
}

export function useModelDetailQuery(name: string | null) {
  return useElysiaQuery(
    queryKeys.pricingModel(name ?? ""),
    () => rpc.api.models.pricing.detail.get({ query: { model: name! } }),
    { enabled: name !== null },
  );
}
