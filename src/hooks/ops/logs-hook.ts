"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";

// Logs are live upstream data: the global staleTime:Infinity default would show
// a stale snapshot after navigating away and back. Mark them stale immediately
// and refetch on every mount so returning to the page always pulls fresh rows.
const FRESH_ON_NAV = { staleTime: 0, refetchOnMount: "always" } as const;

export function useUsageLogsQuery(query?: EdenQuery<typeof rpc.api.ops.logs>) {
  return useElysiaQuery(
    queryKeys.usageLogs(query),
    () => rpc.api.ops.logs.get({ query }),
    FRESH_ON_NAV,
  );
}

export function useUsageLogsStatQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.stat>,
) {
  return useElysiaQuery(
    queryKeys.usageLogsStat(query),
    () => rpc.api.ops.logs.stat.get({ query }),
    FRESH_ON_NAV,
  );
}

export function useMidjourneyLogsQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.midjourney>,
) {
  return useElysiaQuery(
    queryKeys.midjourneyLogs(query),
    () => rpc.api.ops.logs.midjourney.get({ query }),
    FRESH_ON_NAV,
  );
}

export function useTaskLogsQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.task>,
) {
  return useElysiaQuery(
    queryKeys.taskLogs(query),
    () => rpc.api.ops.logs.task.get({ query }),
    FRESH_ON_NAV,
  );
}
