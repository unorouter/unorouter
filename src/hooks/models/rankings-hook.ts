"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function useRankingsQuery(period: RankingPeriod) {
  return useElysiaQuery(queryKeys.rankings(period), () =>
    rpc.api.models.rankings.get({ query: { period } }),
  );
}
