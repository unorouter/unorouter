"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";

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
