"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useHistoryStatsQuery() {
  return useQuery({
    queryKey: queryKeys.statsHistory(),
    queryFn: async () => {
      return handleElysia(await rpc.api.ops.stats.history.get());
    },
    enabled: false,
  });
}
