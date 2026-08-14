"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function useRankingsQuery(period: RankingPeriod) {
  // staleTime "static": server-dehydrated dataset that must not refetch on
  // mount. Static queries are skipped by invalidate/refetchQueries; use
  // queryClient.fetchQuery to force-update.
  return useElysiaQuery(
    queryKeys.rankings(period),
    () => rpc.api.models.rankings.get({ query: { period } }),
    { staleTime: "static" },
  );
}
