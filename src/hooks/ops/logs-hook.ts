"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useUsageLogsQuery(query?: EdenQuery<typeof rpc.api.ops.logs>) {
  return useQuery({
    queryKey: queryKeys.usageLogs(query),
    queryFn: async () => handleElysia(await rpc.api.ops.logs.get({ query })),
  });
}

export function useUsageLogsStatQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.stat>,
) {
  return useQuery({
    queryKey: queryKeys.usageLogsStat(query),
    queryFn: async () =>
      handleElysia(await rpc.api.ops.logs.stat.get({ query })),
  });
}

export function useMidjourneyLogsQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.midjourney>,
) {
  return useQuery({
    queryKey: queryKeys.midjourneyLogs(query),
    queryFn: async () =>
      handleElysia(await rpc.api.ops.logs.midjourney.get({ query })),
  });
}

export function useTaskLogsQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.task>,
) {
  return useQuery({
    queryKey: queryKeys.taskLogs(query),
    queryFn: async () =>
      handleElysia(await rpc.api.ops.logs.task.get({ query })),
  });
}

// Resolve which upstream channel/provider actually served a request. new-api
// sends no channel header on the stream, but logs the channel by request_id, so
// this looks the log row up after the fact. Returns the channel_name (the
// reseller that auto-routing picked) or null when no match yet. Enabled only
// when a request_id is present.
export function useUsedProviderQuery(requestId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.usedProvider(requestId ?? ""),
    enabled: !!requestId,
    queryFn: async () => {
      const res = await handleElysia(
        await rpc.api.ops.logs.get({
          query: { request_id: requestId ?? "", page_size: 1 },
        }),
      );
      const log = res?.items?.[0];
      return log?.channel_name?.trim() || null;
    },
  });
}
