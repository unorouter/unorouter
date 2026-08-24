"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function usePricingBrowseQuery(enabled = true) {
  return useElysiaQuery(
    queryKeys.pricingBrowse(),
    () => rpc.api.models.pricing.browse.get(),
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

// ~143KB vs 481KB for the full list.
export function usePricingCatalogQuery(enabled = true) {
  return useElysiaQuery(
    queryKeys.pricingCatalog(),
    () => rpc.api.models.pricing.catalog.get(),
    { staleTime: "static", enabled },
  );
}

// Per model (~1KB); shipping every model's groups was 57KB of the old payload.
export function useModelGroupsQuery(name: string | null) {
  return useElysiaQuery(
    queryKeys.pricingModelGroups(name ?? ""),
    () =>
      rpc.api.models.pricing["model-groups"].get({ query: { model: name! } }),
    { staleTime: "static", enabled: !!name },
  );
}
