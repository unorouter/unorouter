"use client";

import { buildGroupEntries } from "@/lib/api/pricing";
import { useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { useEffect, useEffectEvent } from "react";

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

export function useTaskImageModelsQuery() {
  return useElysiaQuery(
    queryKeys.pricingTaskImageModels(),
    () => rpc.api.models.pricing["task-image-models"].get(),
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

// Resets the pin only once SETTLED: the upstream list is a 5-minute cache, so a
// partial list would delete the pin for good.
export function useModelGroupPin(
  model: string | null,
  pin: string | null | undefined,
  onStale: () => void,
) {
  const query = useModelGroupsQuery(model);
  const ratioMap = query.data?.group_ratio ?? {};
  const enableGroups = query.data?.enable_groups ?? [];
  const candidates = enableGroups.length ? enableGroups : Object.keys(ratioMap);
  const stale =
    !!pin &&
    query.isSuccess &&
    !query.isFetching &&
    candidates.length > 0 &&
    !candidates.includes(pin);
  const reset = useEffectEvent(() => {
    logChatDebug("group.pin_reset", {
      model,
      pin,
      candidateGroups: candidates,
      ratioKeys: Object.keys(ratioMap),
    });
    onStale();
  });
  useEffect(() => {
    if (stale) reset();
  }, [stale]);
  return {
    enableGroups,
    groupEntries: buildGroupEntries(candidates, ratioMap),
    groupProviders: query.data?.group_providers ?? {},
  };
}

export function useConsentModelsQuery() {
  return useElysiaQuery(queryKeys.consentModels(), () =>
    rpc.api.models.pricing["consent-models"].get(),
  );
}
