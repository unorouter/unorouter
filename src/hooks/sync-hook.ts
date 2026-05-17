"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import type { SyncKindName } from "@/lib/validation/sync";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Sync hooks. Three generic mutations cover every Group A entity:
// `useSyncMutation` (Add + Resync, idempotent POST), `useRemoveSyncMutation`,
// plus a `useSyncStateQuery` for hydration and per-row badge reads.
// Each mutation is parameterized by `kind`; consumers pass the entity body
// as `payload` so the server can upsert from a missing/stale state.
// ---------------------------------------------------------------------------

export function useSyncStateQuery() {
  return useQuery({
    queryKey: queryKeys.syncState(),
    queryFn: async () => handleElysia(await rpc.api.sync.state.get()),
    staleTime: 60_000,
  });
}

type SyncArgs = {
  kind: SyncKindName;
  id: string;
  payload?: unknown;
  days?: number;
  /** Mirror PATCH on save: refresh content w/o resetting the 30-day window. */
  keepExpiry?: boolean;
};

export function useSyncMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: SyncArgs) =>
      handleElysia(
        await rpc.api.sync({ kind: args.kind })({ id: args.id }).post({
          days: args.days,
          payload: args.payload,
          keepExpiry: args.keepExpiry,
        }),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
  });
}

type RemoveArgs = { kind: SyncKindName; id: string };

export function useRemoveSyncMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: RemoveArgs) =>
      handleElysia(
        await rpc.api.sync({ kind: args.kind })({ id: args.id }).delete(),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
  });
}

// Reads the current syncExpiresAt for one row from the bulk sync-state cache
// so consumers (SyncBadge) don't fan out N independent queries.
export function useSyncStateForRow(kind: SyncKindName, id: string) {
  const query = useSyncStateQuery();
  const row = query.data?.[kind]?.find((r) => r.id === id);
  return {
    isLoaded: query.isSuccess,
    syncExpiresAt: row?.syncExpiresAt ?? null,
  };
}
