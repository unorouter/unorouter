"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";

export function useDashboardQuotaQuery(
  query?: EdenQuery<typeof rpc.api.billing.dashboard.quota>,
  options?: { enabled?: boolean },
) {
  return useElysiaQuery(
    queryKeys.dashboardQuota(query),
    () => rpc.api.billing.dashboard.quota.get({ query }),
    options,
  );
}

export function useDashboardUptimeQuery() {
  return useElysiaQuery(queryKeys.dashboardUptime(), () =>
    rpc.api.billing.dashboard.uptime.get(),
  );
}
