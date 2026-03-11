"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { GetUserLogsParams } from "@/openapi";
import { useQuery } from "@tanstack/react-query";

export type LogFilters = GetUserLogsParams;

export function useUsageLogsQuery(filters: GetUserLogsParams = {}) {
  return useQuery({
    queryKey: queryKeys.usageLogs(filters),
    queryFn: async () =>
      handleElysia(
        await rpc.api.logs.get({
          query: {
            p: filters.p?.toString(),
            page_size: filters.page_size?.toString(),
            type: filters.type?.toString(),
            start_timestamp: filters.start_timestamp?.toString(),
            end_timestamp: filters.end_timestamp?.toString(),
            token_name: filters.token_name || undefined,
            model_name: filters.model_name || undefined,
            group: filters.group || undefined,
            request_id: filters.request_id || undefined,
          },
        }),
      ),
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
      handleElysia(
        await rpc.api.logs.stat.get({
          query: {
            type: filters.type?.toString(),
            start_timestamp: filters.start_timestamp?.toString(),
            end_timestamp: filters.end_timestamp?.toString(),
            token_name: filters.token_name || undefined,
            model_name: filters.model_name || undefined,
          },
        }),
      ),
  });
}
