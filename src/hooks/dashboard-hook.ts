"use client";

import { filterQuotaData } from "@/components/pages/dashboard/stats";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import {
  dashboardStoreAtom,
  defaultTimestamps,
} from "@/store/dashboard-store";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";

export function useDashboardData() {
  const [store, setStore] = useAtom(dashboardStoreAtom);
  const { startTs, endTs } = store ?? defaultTimestamps();
  const periodMinutes = (endTs - startTs) / 60;

  const quotaQuery = useDashboardQuotaQuery(startTs, endTs);
  const rawData = filterQuotaData(quotaQuery.data ?? []);

  const dateRange = {
    from: new Date(startTs * 1000),
    to: new Date(endTs * 1000),
  };

  const setDateRange = (range: { from: Date; to: Date }) =>
    setStore({
      startTs: Math.floor(range.from.getTime() / 1000),
      endTs: Math.floor(range.to.getTime() / 1000),
    });

  return {
    dateRange,
    setDateRange,
    periodMinutes,
    quotaQuery,
    rawData,
  };
}

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
    queryFn: async () => handleElysia(await rpc.api.dashboard.uptime.get()),
  });
}
