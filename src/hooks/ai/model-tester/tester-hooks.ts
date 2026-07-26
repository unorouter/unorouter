"use client";

import {
  deleteTest,
  readHistoryModelTestDetails,
  readHistoryModels,
  readHistoryProviders,
  readTestDetail,
  readTestHistory,
  recordTestRun,
  type HistoryProviderRow,
  type HistoryTestDetail,
  type TestListItem,
} from "@/lib/db/client/data/tester/tester";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { useApiMutation } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { handleElysia } from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";
import type { VerifyResult } from "@/lib/ai/verify/types";
import type { VerifyProviderValue } from "@/lib/validation/model-tester";

export function useTestHistory() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTests(), userId],
    queryFn: (): Promise<TestListItem[]> => readTestHistory(userId),
  });
}

export function useHistoryProviders() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTestHistoryProviders(), userId],
    queryFn: (): Promise<HistoryProviderRow[]> => readHistoryProviders(userId),
  });
}

export function useHistoryModels(host: string) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTestHistoryModels(host), userId],
    queryFn: () => readHistoryModels(userId, host),
  });
}

export function useHistoryModelTests(host: string, model: string) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTestHistoryModelTests(host, model), userId],
    queryFn: (): Promise<HistoryTestDetail[]> =>
      readHistoryModelTestDetails(userId, host, model),
  });
}

export function useTestDetail(testId: string | undefined) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTest(testId ?? ""), userId],
    queryFn: (): Promise<HistoryTestDetail | null> =>
      testId ? readTestDetail(userId, testId) : Promise.resolve(null),
    enabled: !!testId,
  });
}

export function useCreateTest() {
  const userId = useLocalUserId();
  return useApiMutation<string, { result: VerifyResult }>({
    mutationFn: (vars) => recordTestRun(userId, vars.result, false),
    invalidates: [queryKeys.modelTests()],
  });
}

export function useDeleteTest() {
  const userId = useLocalUserId();
  return useApiMutation<void, string>({
    mutationFn: (testId) => deleteTest(userId, testId),
    invalidates: [
      queryKeys.modelTests(),
      queryKeys.modelTestHistoryProviders(),
    ],
  });
}

export type VerifyPublishVars = {
  provider: VerifyProviderValue;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type VerifyPublishResult =
  | { published: boolean; result: VerifyResult }
  | { published: false; deduped?: true; error?: string };

export function useVerifyAndPublish() {
  const userId = useLocalUserId();
  return useApiMutation<VerifyPublishResult, VerifyPublishVars>({
    mutationFn: async (vars) => {
      const res = (await handleElysia(
        await rpc.api.models["model-tester"]["verify-and-publish"].post({
          provider: vars.provider,
          baseUrl: vars.baseUrl.replace(/\/+$/, ""),
          apiKey: vars.apiKey,
          model: vars.model,
        }),
      )) as VerifyPublishResult;
      if ("result" in res)
        await recordTestRun(userId, res.result, res.published);
      return res;
    },
    invalidates: [
      queryKeys.modelTests(),
      queryKeys.modelTesterRankings(1, 20),
      queryKeys.modelTesterStats(),
    ],
  });
}
