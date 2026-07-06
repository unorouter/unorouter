"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function useBenchmarksQuery(modelName: string | null) {
  return useElysiaQuery(
    queryKeys.benchmarks(modelName ?? ""),
    () => rpc.api.models.benchmarks.get({ query: { model: modelName! } }),
    { enabled: Boolean(modelName) },
  );
}
