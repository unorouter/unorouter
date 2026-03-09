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
import dayjs from "dayjs";
import { useAtom } from "jotai";

export function useDashboardData() {
  const [store, setStore] = useAtom(dashboardStoreAtom);
  const { startTs, endTs } = store ?? defaultTimestamps();
  const periodMinutes = (endTs - startTs) / 60;

  const quotaQuery = useDashboardQuotaQuery(startTs, endTs);
  const rawData = filterQuotaData(quotaQuery.data ?? []);

  const dateRange = {
    from: dayjs.unix(startTs).toDate(),
    to: dayjs.unix(endTs).toDate(),
  };

  const setDateRange = (range: { from: Date; to: Date }) =>
    setStore({
      startTs: dayjs(range.from).unix(),
      endTs: dayjs(range.to).unix(),
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
