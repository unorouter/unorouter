"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function useHistoryStatsQuery() {
  return useElysiaQuery(
    queryKeys.statsHistory(),
    () => rpc.api.ops.stats.history.get(),
    { enabled: false },
  );
}
