"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useDashboardQuotaQuery(startTs?: number, endTs?: number) {
  return useQuery({
    queryKey: queryKeys.dashboardQuota(startTs, endTs),
    queryFn: async () =>
      handleElysia(
        await rpc.api.dashboard.quota.get({
          query: {
            start_timestamp: startTs?.toString(),
            end_timestamp: endTs?.toString(),
          },
        }),
      ),
  });
}

export function useDashboardUptimeQuery() {
  return useQuery({
    queryKey: queryKeys.dashboardUptime(),
    queryFn: async () =>
      handleElysia(await rpc.api.dashboard.uptime.get()),
    staleTime: 5 * 60 * 1000,
  });
}
