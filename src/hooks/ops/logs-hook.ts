"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";
import { tablesHydratedAtom } from "@/store/data-table-store";
import { useAtomValue } from "jotai";

// NOT refetchOnMount:"always": that duplicates every dehydrated query on hydrate.
const FRESH_ON_NAV = { staleTime: 10_000 } as const;

// Gated on hydration: the cookie filters land an effect-tick after mount, and
// fetching earlier fires a throwaway default-filter request pair.
function useFreshOnNav() {
  const hydrated = useAtomValue(tablesHydratedAtom);
  return { ...FRESH_ON_NAV, enabled: hydrated };
}

export function useUsageLogsQuery(query?: EdenQuery<typeof rpc.api.ops.logs>) {
  return useElysiaQuery(
    queryKeys.usageLogs(query),
    () => rpc.api.ops.logs.get({ query }),
    useFreshOnNav(),
  );
}

export function useUsageLogsStatQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.stat>,
) {
  return useElysiaQuery(
    queryKeys.usageLogsStat(query),
    () => rpc.api.ops.logs.stat.get({ query }),
    useFreshOnNav(),
  );
}

export function useMidjourneyLogsQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.midjourney>,
) {
  return useElysiaQuery(
    queryKeys.midjourneyLogs(query),
    () => rpc.api.ops.logs.midjourney.get({ query }),
    useFreshOnNav(),
  );
}

export function useTaskLogsQuery(
  query?: EdenQuery<typeof rpc.api.ops.logs.task>,
) {
  return useElysiaQuery(
    queryKeys.taskLogs(query),
    () => rpc.api.ops.logs.task.get({ query }),
    useFreshOnNav(),
  );
}
