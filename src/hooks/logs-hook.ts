"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useUsageLogsQuery(query?: EdenQuery<typeof rpc.api.logs>) {
  return useQuery({
    queryKey: queryKeys.usageLogs(query),
    queryFn: async () => handleElysia(await rpc.api.logs.get({ query })),
  });
}

export function useUsageLogsStatQuery(
  query?: EdenQuery<typeof rpc.api.logs.stat>,
) {
  return useQuery({
    queryKey: queryKeys.usageLogsStat(query),
    queryFn: async () => handleElysia(await rpc.api.logs.stat.get({ query })),
  });
}

export function useMidjourneyLogsQuery(
  query?: EdenQuery<typeof rpc.api.logs.midjourney>,
) {
  return useQuery({
    queryKey: queryKeys.midjourneyLogs(query),
    queryFn: async () =>
      handleElysia(await rpc.api.logs.midjourney.get({ query })),
  });
}

export function useTaskLogsQuery(query?: EdenQuery<typeof rpc.api.logs.task>) {
  return useQuery({
    queryKey: queryKeys.taskLogs(query),
    queryFn: async () => handleElysia(await rpc.api.logs.task.get({ query })),
  });
}
