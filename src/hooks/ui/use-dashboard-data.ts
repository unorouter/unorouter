"use client";

import type { QuotaDataItem } from "@/components/pages/sidebar/dashboard/stats";
import {
  useDashboardQuotaQuery,
  useDashboardUptimeQuery,
} from "@/hooks/dashboard-hook";
import { useStatusQuery } from "@/hooks/status-hook";
import {
  DEFAULT_RANGE_HOURS,
  dashboardStoreAtom,
  defaultTimestamps,
} from "@/store/dashboard-store";
import dayjs from "dayjs";
import { useAtom } from "jotai";

export function useDashboardData() {
  const [store, setStore] = useAtom(dashboardStoreAtom);
  const { startTs, endTs } = store;
  const periodMinutes = (endTs - startTs) / 60;

  const statusQuery = useStatusQuery();
  const quotaQuery = useDashboardQuotaQuery({
    start_timestamp: startTs,
    end_timestamp: endTs,
  });
  const uptimeQuery = useDashboardUptimeQuery();
  const rawData = (quotaQuery.data ?? []).filter(
    (item): item is QuotaDataItem => item != null,
  );

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
