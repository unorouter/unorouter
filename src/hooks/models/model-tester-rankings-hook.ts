"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { handleElysia } from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";

export function useModelTesterRankings(page: number, pageSize: number) {
  return useElysiaQuery(queryKeys.modelTesterRankings(page, pageSize), () =>
    rpc.api.models["model-tester"].rankings.get({
      query: { page, pageSize },
    }),
  );
}

export function useModelTesterStats() {
  return useElysiaQuery(queryKeys.modelTesterStats(), () =>
    rpc.api.models["model-tester"].stats.get(),
  );
}

// Level 2: one provider + its models.
export function useProviderDetail(host: string) {
  return useElysiaQuery(queryKeys.modelTesterProviderDetail(host), () =>
    rpc.api.models["model-tester"].rankings({ host }).get(),
  );
}

export function useRankingDetail(host: string, model: string) {
  return useElysiaQuery(queryKeys.modelTesterRankingDetail(host, model), () =>
    rpc.api.models["model-tester"].rankings({ host })({ model }).get(),
  );
}

// One published test + probe evidence (the unified result-card detail).
export function usePublishedTestDetail(id: string) {
  return useElysiaQuery(queryKeys.modelTesterPublishedTest(id), () =>
    rpc.api.models["model-tester"].published({ id }).detail.get(),
  );
}

// Submitter self-retract of a published row. The server enforces ownership; a
// non-owner delete returns { deleted: false } and the board is unchanged.
export function useDeletePublishedTest(host: string, model: string) {
  return useApiMutation<{ deleted: boolean }, string>({
    mutationFn: async (id) =>
      handleElysia(
        await rpc.api.models["model-tester"].published({ id }).delete(),
      ) as { deleted: boolean },
    invalidates: [
      queryKeys.modelTesterRankingDetail(host, model),
      queryKeys.modelTesterProviderDetail(host),
      queryKeys.modelTesterRankings(1, 20),
      queryKeys.modelTesterStats(),
    ],
  });
}
