"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export type StatusBucket = "1m" | "5m" | "15m" | "1h" | "1d";

/**
 * Single round-trip hook used by the standalone /status page. Returns
 * components + buckets + open incidents in one shot.
 */
export function useStatusPage(bucket: StatusBucket = "1m", hours: number = 24) {
  return useQuery({
    queryKey: queryKeys.modelStatusPage(bucket, hours),
    queryFn: async () =>
      handleElysia(
        await rpc.api["model-status"].page.get({
          query: { bucket, hours },
        }),
      ),
    staleTime: 30_000,
  });
}

/**
 * Lightweight hook used by the per-card <StatusPill> on /models — only the
 * component list, no bucket data.
 */
export function useStatusComponents() {
  return useQuery({
    queryKey: queryKeys.modelStatusComponents(),
    queryFn: async () =>
      handleElysia(await rpc.api["model-status"].components.get()),
    staleTime: 30_000,
  });
}

/**
 * Lazy bucket fetch (for "show me 1m granularity for this model" or
 * future zoom controls).
 */
export function useStatusBuckets(
  model: string,
  bucket: "1m" | "5m" | "15m" | "1h" | "1d" = "15m",
  hours: number = 24,
) {
  return useQuery({
    queryKey: queryKeys.modelStatusBuckets(model, bucket, hours),
    queryFn: async () =>
      handleElysia(
        await rpc.api["model-status"].buckets.get({
          query: { model, bucket, hours },
        }),
      ),
    staleTime: 60_000,
    enabled: !!model,
  });
}

export function useStatusIncidents(since?: number) {
  return useQuery({
    queryKey: queryKeys.modelStatusIncidents(since),
    queryFn: async () =>
      handleElysia(
        await rpc.api["model-status"].incidents.get({
          query: since ? { since } : {},
        }),
      ),
    staleTime: 60_000,
  });
}
