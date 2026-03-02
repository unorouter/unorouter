"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export function useLiveStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats.live(),
    queryFn: async () => handleElysia(await rpc.api.stats.live.get()),
    enabled: false,
  });
}

export function useHistoryStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats.history(),
    queryFn: async () => handleElysia(await rpc.api.stats.history.get()),
    enabled: false,
  });
}
