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
