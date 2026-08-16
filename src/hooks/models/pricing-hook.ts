"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

// The /models browse and /compare pages: catalog rows plus the blurb and the
// metadata they filter on, without the group maps only the detail sheet reads.
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

// The model selector's dropdown data: ~143KB vs the 481KB full list, because it
// carries no description and no metadata blob.
export function usePricingCatalogQuery(enabled = true) {
  return useElysiaQuery(
    queryKeys.pricingCatalog(),
    () => rpc.api.models.pricing.catalog.get(),
    { staleTime: "static", enabled },
  );
}

// The group-pin dropdown needs the ACTIVE model's servable groups and their
// ratios. Fetched per model (~1KB) rather than shipping every model's groups in
// the catalog, which was 57KB of the old payload for one dropdown.
export function useModelGroupsQuery(name: string | null) {
  return useElysiaQuery(
    queryKeys.pricingModelGroups(name ?? ""),
    () =>
      rpc.api.models.pricing["model-groups"].get({ query: { model: name! } }),
    { staleTime: "static", enabled: !!name },
  );
}
