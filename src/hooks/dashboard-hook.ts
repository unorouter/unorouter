"use client";

import {
  dateRangeToTimestamps,
  filterQuotaData,
} from "@/components/pages/dashboard/stats";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { dashboardStoreAtom } from "@/store/dashboard-store";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";

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

export function useDashboardData() {
  const [dateRange, setDateRange] = useAtom(dashboardStoreAtom);
  const { startTs, endTs, periodMinutes } = dateRangeToTimestamps(dateRange);
  const quotaQuery = useDashboardQuotaQuery(startTs, endTs);
  const rawData = filterQuotaData(quotaQuery.data ?? []);

  return { dateRange, setDateRange, periodMinutes, quotaQuery, rawData };
}

export function useDashboardUptimeQuery() {
  return useQuery({
    queryKey: queryKeys.dashboardUptime(),
    queryFn: async () =>
      handleElysia(await rpc.api.dashboard.uptime.get()),
    staleTime: 5 * 60 * 1000,
  });
}
