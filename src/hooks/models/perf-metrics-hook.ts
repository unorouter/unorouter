"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function usePerfMetricsSummaryQuery(hours: number = 24) {
  // staleTime "static": server-dehydrated dataset that must not refetch on
  // mount. Static queries are skipped by invalidate/refetchQueries; use
  // queryClient.fetchQuery to force-update.
  return useElysiaQuery(
    queryKeys.perfMetricsSummary(hours),
    () => rpc.api.models["perf-metrics"].summary.get({ query: { hours } }),
    { enabled: false, staleTime: "static" },
  );
}

export function usePerfMetricsQuery(
  modelName: string | null,
  hours: number = 24,
) {
  return useElysiaQuery(
    queryKeys.perfMetrics(modelName ?? "", hours),
    () =>
      rpc.api.models["perf-metrics"].get({
        query: { model: modelName!, hours },
      }),
    { enabled: Boolean(modelName) },
  );
}
