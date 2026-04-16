"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { getRpc } from "@/lib/rpc-lazy";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useLiveStatsQuery() {
  return useQuery({
    queryKey: queryKeys.statsLive(),
    queryFn: async () => {
      const rpc = await getRpc();
      return handleElysia(await rpc.api.stats.live.get());
    },
    enabled: false,
  });
}

export function useHistoryStatsQuery() {
  return useQuery({
    queryKey: queryKeys.statsHistory(),
    queryFn: async () => {
      const rpc = await getRpc();
      return handleElysia(await rpc.api.stats.history.get());
    },
    enabled: false,
  });
}
