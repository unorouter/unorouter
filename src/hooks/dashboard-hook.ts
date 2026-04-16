"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { EdenArgs } from "@/lib/types/eden";
import { useQuery } from "@tanstack/react-query";

export function useDashboardQuotaQuery(
  args: EdenArgs<typeof rpc.api.dashboard.quota, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.dashboardQuota(args.query),
    queryFn: async () => {
      return handleElysia(
        await rpc.api.dashboard.quota.get({ query: args.query }),
      );
    },
  });
}

export function useDashboardUptimeQuery() {
  return useQuery({
    queryKey: queryKeys.dashboardUptime(),
    queryFn: async () => {
      return handleElysia(await rpc.api.dashboard.uptime.get());
    },
  });
}
