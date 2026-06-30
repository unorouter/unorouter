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
} from "@/lib/db/client/data/tester";
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

// Level 1: the user's providers (grouped by host).
export function useHistoryProviders() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTestHistoryProviders(), userId],
    queryFn: (): Promise<HistoryProviderRow[]> => readHistoryProviders(userId),
  });
}

// Level 2: one provider's models.
export function useHistoryModels(host: string) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: [...queryKeys.modelTestHistoryModels(host), userId],
    queryFn: () => readHistoryModels(userId, host),
  });
}

// Level 3: every test for one provider+model, WITH probes, so each test renders
// inline as an accordion (no deeper click into a per-test page).
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

// Persist a finished LOCAL test to history. Local tests are never published -
// the client-side verdict is forgeable, so it stays on the user's device only.
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
  | { published: true; result: VerifyResult }
  | { published: false; deduped?: true; error?: string };

// Server-verified publish: sends the key to the backend, which runs the WHOLE
// test itself and stores its own verdict. This is the only way onto the public
// board, so the leaderboard cannot be forged. The server-computed result is also
// kept in the user's LOCAL history (marked published).
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
      if (res.published) await recordTestRun(userId, res.result, true);
      return res;
    },
    invalidates: [
      queryKeys.modelTests(),
      queryKeys.modelTesterRankings(1, 20),
      queryKeys.modelTesterStats(),
    ],
  });
}
