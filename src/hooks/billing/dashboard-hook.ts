"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useDashboardQuotaQuery(
  query?: EdenQuery<typeof rpc.api.billing.dashboard.quota>,
) {
  return useQuery({
    queryKey: queryKeys.dashboardQuota(query),
    queryFn: async () =>
      handleElysia(await rpc.api.billing.dashboard.quota.get({ query })),
  });
}

export function useDashboardUptimeQuery() {
  return useQuery({
    queryKey: queryKeys.dashboardUptime(),
    queryFn: async () =>
      handleElysia(await rpc.api.billing.dashboard.uptime.get()),
  });
}
