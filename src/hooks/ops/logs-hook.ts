"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";
import { tablesHydratedAtom } from "@/store/data-table-store";
import { useAtomValue } from "jotai";

// Logs are live upstream data, so the global staleTime:Infinity would serve a
// stale snapshot after navigating away and back. A short staleTime still honors
// the server prefetch on first load; refetchOnMount:"always" instead duplicated
// every dehydrated query the instant it hydrated.
const FRESH_ON_NAV = { staleTime: 10_000 } as const;

// Every param derives from the cookie-persisted table filters, which land one
// effect-tick after mount; fetching before that fires a throwaway default-filter
// request pair.
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
