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

// The model selector's dropdown data: ~143KB vs the 481KB full list, because it
// carries no description and no metadata blob.
export function usePricingCatalogQuery(enabled = true) {
  return useElysiaQuery(
    queryKeys.pricingCatalog(),
    () => rpc.api.models.pricing.catalog.get(),
    { staleTime: "static", enabled },
  );
}

// name -> {vendor, isFree, type} for chat surfaces that answer one question
// about the active model.
export function useModelBasicsQuery(enabled = true) {
  return useElysiaQuery(
    queryKeys.pricingModelBasics(),
    () => rpc.api.models.pricing["model-basics"].get(),
    { staleTime: "static", enabled },
  );
}

export function useTextModelsQuery() {
  return useElysiaQuery(
    queryKeys.pricingTextModels(),
    () => rpc.api.models.pricing["text-models"].get(),
    { staleTime: "static" },
  );
}
