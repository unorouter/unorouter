"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function usePerfMetricsSummaryQuery(hours: number = 24) {
  return useQuery({
    queryKey: queryKeys.perfMetricsSummary(hours),
    queryFn: async () =>
      handleElysia(
        await rpc.api["perf-metrics"].summary.get({ query: { hours } }),
      ),
    enabled: false,
  });
}

export function usePerfMetricsQuery(
  modelName: string | null,
  hours: number = 24,
) {
  return useQuery({
    queryKey: queryKeys.perfMetrics(modelName ?? "", hours),
    queryFn: async () =>
      handleElysia(
        await rpc.api["perf-metrics"].get({
          query: { model: modelName!, hours },
        }),
      ),
    enabled: Boolean(modelName),
  });
}
