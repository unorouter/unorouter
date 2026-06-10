"use client";

import { useElysiaQuery } from "@/hooks/use-elysia-query";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";

export function useDashboardQuotaQuery(
  query?: EdenQuery<typeof rpc.api.billing.dashboard.quota>,
) {
  return useElysiaQuery(queryKeys.dashboardQuota(query), () =>
    rpc.api.billing.dashboard.quota.get({ query }),
  );
}

export function useDashboardUptimeQuery() {
  return useElysiaQuery(queryKeys.dashboardUptime(), () =>
    rpc.api.billing.dashboard.uptime.get(),
  );
}
