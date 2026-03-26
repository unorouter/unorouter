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
import { useEffect } from "react";
import { useStatusQuery } from "./status-hook";

export function useDashboardData() {
  const [store, setStore] = useAtom(dashboardStoreAtom);

  useEffect(() => {
    if (!store) setStore(defaultTimestamps());
  }, [store, setStore]);

  const ready = store !== null;
  const { startTs, endTs } = store ?? { startTs: 0, endTs: 0 };
  const periodMinutes = (endTs - startTs) / 60;

  const statusQuery = useStatusQuery();
  const quotaQuery = useDashboardQuotaQuery(
    ready ? startTs : undefined,
    ready ? endTs : undefined,
  );
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

  const resetDateRange = () => setStore(defaultTimestamps());

  const isDefaultRange = endTs - startTs === DEFAULT_RANGE_HOURS * 3600;

  const refetchAll = () => {
    statusQuery.refetch();
    quotaQuery.refetch();
    uptimeQuery.refetch();
  };

  const isFetching = quotaQuery.isFetching;

  return {
    ready,
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
    enabled: startTs !== undefined && endTs !== undefined,
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
