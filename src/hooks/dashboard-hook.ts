"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useDashboardQuotaQuery(
  args: EdenArgs<typeof rpc.api.dashboard.quota, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.dashboardQuota(
      args.query?.start_timestamp,
      args.query?.end_timestamp,
    ),
    queryFn: async () =>
      handleElysia(await rpc.api.dashboard.quota.get({ query: args.query })),
  });
}

export function useDashboardUptimeQuery() {
  return useQuery({
    queryKey: queryKeys.dashboardUptime(),
    queryFn: async () => handleElysia(await rpc.api.dashboard.uptime.get()),
  });
}
