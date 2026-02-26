"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export function useTokenStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats.tokens(),
    queryFn: async () => handleElysia(await rpc.api.stats.tokens.get()),
    enabled: false
  });
}
