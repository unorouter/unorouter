"use client";

import {
  deleteTest,
  readHistoryModelTestDetails,
  readHistoryModels,
  readHistoryProviders,
  recordTestRun,
  type HistoryProviderRow,
  type HistoryTestDetail,
} from "@/lib/db/client/data/tester/tester";
import { useAuthUserId } from "@/hooks/auth/auth-hook";
import { useApiMutation } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { handleElysia } from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";
import type { VerifyResult } from "ai-model-verifier/types";
import type { VerifyProviderValue } from "@/lib/validation/model-tester";

export function useHistoryProviders() {
  const userId = useAuthUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTestHistoryProviders(), userId],
    queryFn: (): Promise<HistoryProviderRow[]> => readHistoryProviders(userId),
  });
}

export function useHistoryModels(host: string) {
  const userId = useAuthUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTestHistoryModels(host), userId],
    queryFn: () => readHistoryModels(userId, host),
  });
}

export function useHistoryModelTests(host: string, model: string) {
  const userId = useAuthUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTestHistoryModelTests(host, model), userId],
    queryFn: (): Promise<HistoryTestDetail[]> =>
      readHistoryModelTestDetails(userId, host, model),
  });
}

export function useCreateTest() {
  const userId = useAuthUserId();
  return useApiMutation<string, { result: VerifyResult }>({
    mutationFn: (vars) => recordTestRun(userId, vars.result, false),
    invalidates: [queryKeys.modelTests()],
  });
}

export function useDeleteTest() {
  const userId = useAuthUserId();
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
  | { published: false; deduped?: true; error?: string; result?: VerifyResult };

export function useVerifyAndPublish() {
  const userId = useAuthUserId();
  return useApiMutation<VerifyPublishResult, VerifyPublishVars>({
    mutationFn: async (vars) => {
      const res = await handleElysia(
        await rpc.api.models["model-tester"]["verify-and-publish"].post({
          provider: vars.provider,
          baseUrl: vars.baseUrl.replace(/\/+$/, ""),
          apiKey: vars.apiKey,
          model: vars.model,
        }),
      );
      // A connectivity failure now returns its result for display, but there is
      // no verdict worth keeping, so only a real run reaches history.
      if ("result" in res && res.result && !("error" in res && res.error))
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
