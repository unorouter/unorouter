"use client";

import { useElysiaQuery } from "@/hooks/use-elysia-query";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useUsageLogsQuery(query?: EdenQuery<typeof rpc.api.ops.logs>) {
  return useElysiaQuery(queryKeys.usageLogs(query), () =>
    rpc.api.ops.logs.get({ query }),
  );
}

export function useUsageLogsStatQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.stat>,
) {
  return useElysiaQuery(queryKeys.usageLogsStat(query), () =>
    rpc.api.ops.logs.stat.get({ query }),
  );
}

export function useMidjourneyLogsQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.midjourney>,
) {
  return useElysiaQuery(queryKeys.midjourneyLogs(query), () =>
    rpc.api.ops.logs.midjourney.get({ query }),
  );
}

export function useTaskLogsQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.task>,
) {
  return useElysiaQuery(queryKeys.taskLogs(query), () =>
    rpc.api.ops.logs.task.get({ query }),
  );
}

// Which upstream channel served a request: new-api sends no channel header on
// the stream but logs it by request_id, so look the log row up after the fact.
export function useUsedProviderQuery(requestId: string | null | undefined) {
  return useElysiaQuery(
    queryKeys.usedProvider(requestId ?? ""),
    () =>
      rpc.api.ops.logs.get({
        query: { request_id: requestId ?? "", page_size: 1 },
      }),
    {
      enabled: !!requestId,
      select: (res) => res?.items?.[0]?.channel_name?.trim() || null,
    },
  );
}
