"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useUsageLogsQuery(
  args: EdenArgs<typeof rpc.api.logs, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.usageLogs(args.query),
    queryFn: async () =>
      handleElysia(await rpc.api.logs.get({ query: args.query })),
  });
}

export function useUsageLogsStatQuery(
  args: EdenArgs<typeof rpc.api.logs.stat, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.usageLogsStat(args.query),
    queryFn: async () =>
      handleElysia(await rpc.api.logs.stat.get({ query: args.query })),
  });
}
