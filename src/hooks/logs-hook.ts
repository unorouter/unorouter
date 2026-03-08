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
