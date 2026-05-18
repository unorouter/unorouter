"use client";

import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useRankingsQuery(period: RankingPeriod) {
  return useQuery({
    queryKey: queryKeys.rankings(period),
    queryFn: async () => {
      return handleElysia(await rpc.api.rankings.get({ query: { period } }));
    },
  });
}
