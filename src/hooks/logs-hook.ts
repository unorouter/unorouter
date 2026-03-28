"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { GetUserLogsParams } from "@/openapi";
import { useQuery } from "@tanstack/react-query";

export function useUsageLogsQuery(filters: GetUserLogsParams = {}) {
  return useQuery({
    queryKey: queryKeys.usageLogs(filters),
    queryFn: async () =>
      handleElysia(await rpc.api.logs.get({ query: filters })),
  });
}

export type LogStatFilters = {
  type?: number;
  start_timestamp?: number;
  end_timestamp?: number;
  token_name?: string;
  model_name?: string;
};

export function useUsageLogsStatQuery(filters: LogStatFilters = {}) {
  return useQuery({
    queryKey: queryKeys.usageLogsStat(filters),
    queryFn: async () =>
      handleElysia(await rpc.api.logs.stat.get({ query: filters })),
  });
}
