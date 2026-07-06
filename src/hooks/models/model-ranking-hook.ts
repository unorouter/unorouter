"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";
import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function useModelRankingQuery(
  modelName: string | null,
  period: RankingPeriod,
) {
  return useElysiaQuery(
    queryKeys.modelRanking(modelName ?? "", period),
    () =>
      rpc.api.models["model-ranking"].get({
        query: { model: modelName!, period },
      }),
    { enabled: Boolean(modelName) },
  );
}
