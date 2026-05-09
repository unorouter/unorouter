"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { EdenArgs } from "@/lib/types/eden";
import { useQuery } from "@tanstack/react-query";

export function useUsageLogsQuery(
  args: EdenArgs<typeof rpc.api.logs, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.usageLogs(args.query),
    queryFn: async () => {
      return handleElysia(await rpc.api.logs.get({ query: args.query }));
    },
  });
}

export function useUsageLogsStatQuery(
  args: EdenArgs<typeof rpc.api.logs.stat, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.usageLogsStat(args.query),
    queryFn: async () => {
      return handleElysia(await rpc.api.logs.stat.get({ query: args.query }));
    },
  });
}

export function useMidjourneyLogsQuery(
  args: EdenArgs<typeof rpc.api.logs.midjourney, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.midjourneyLogs(args.query),
    queryFn: async () => {
      return handleElysia(
        await rpc.api.logs.midjourney.get({ query: args.query }),
      );
    },
  });
}

export function useTaskLogsQuery(
  args: EdenArgs<typeof rpc.api.logs.task, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.taskLogs(args.query),
    queryFn: async () => {
      return handleElysia(await rpc.api.logs.task.get({ query: args.query }));
    },
  });
}
