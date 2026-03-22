"use client";

import { filterQuotaData } from "@/components/pages/sidebar/dashboard/stats";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import {
  DEFAULT_RANGE_HOURS,
  dashboardStoreAtom,
  defaultTimestamps,
} from "@/store/dashboard-store";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useAtom } from "jotai";
import { useStatusQuery } from "./status-hook";

export function useDashboardData() {
  const [store, setStore] = useAtom(dashboardStoreAtom);
  const { startTs, endTs } = store ?? defaultTimestamps();
  const periodMinutes = (endTs - startTs) / 60;

  const statusQuery = useStatusQuery();
  const quotaQuery = useDashboardQuotaQuery(startTs, endTs);
  const uptimeQuery = useDashboardUptimeQuery();
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

  const resetDateRange = () => setStore(null);

  const isDefaultRange =
    !store || endTs - startTs === DEFAULT_RANGE_HOURS * 3600;

  const refetchAll = () => {
    statusQuery.refetch();
    quotaQuery.refetch();
    uptimeQuery.refetch();
  };

  const isFetching = quotaQuery.isFetching;

  return {
    dateRange,
    setDateRange,
    resetDateRange,
    isDefaultRange,
    refetchAll,
    isFetching,
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
