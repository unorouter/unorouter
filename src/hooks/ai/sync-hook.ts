"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  readLocalConversation,
  upsertLocalConversation,
} from "@/lib/db/client/data/chat";
import { buildSyncPayload } from "@/lib/db/client/sync/build-payload";
import {
  readPendingSync,
  retryPendingTargets,
  type PendingSyncRow,
} from "@/lib/db/client/sync/pending-sync";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import type { SyncKindName } from "@/lib/validation/sync";
import type { SyncBundle, SyncStateBulk } from "@/server/ai/sync/sync.service";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// Hydrator seeds this; invalidations drive every later refetch (no polling).
function useSyncStateQuery() {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.syncState(),
    queryFn: async () => handleElysia(await rpc.api.ai.sync.state.get()),
    enabled: !!auth.data,
    staleTime: Infinity,
  });
}

type SyncStateRow = SyncStateBulk[SyncKindName][number];

type SyncEntity = {
  id?: string;
  userId?: number;
  syncExpiresAt: Date | string | number | null;
  updatedAt: Date | string;
};

// The sync-state query is `enabled: false` (only seeded by the hydrator), so
// invalidateQueries can never refetch it. After a mutation we patch the cache
// row directly. Every bundle has exactly one non-array member (the primary
// entity row); it carries the fresh syncExpiresAt + updatedAt.
function bundleSyncRow(result: SyncBundle): SyncStateRow | null {
  const entity = Object.values(result).find(
    (v): v is SyncEntity => v != null && !Array.isArray(v),
  );
  if (!entity) return null;
  // Theme rows are keyed by userId (no own id); see getSyncStateBulk.
  return {
    id: entity.id ?? String(entity.userId),
    syncExpiresAt:
      entity.syncExpiresAt != null ? new Date(entity.syncExpiresAt) : null,
    updatedAt: new Date(entity.updatedAt),
  };
}

function patchSyncStateCache(
  qc: QueryClient,
  kind: SyncKindName,
  id: string,
  row: SyncStateRow | null,
) {
  qc.setQueryData<SyncStateBulk>(queryKeys.syncState(), (prev) => {
    if (!prev) return prev;
    const rest = prev[kind].filter((r) => r.id !== id);
    return { ...prev, [kind]: row ? [...rest, row] : rest };
  });
}

// Mirror the server-assigned expiry onto the local conversation row so
// local-first checks (resync, auto-mirror on edit) read it as synced.
async function mirrorConvExpiry(
  userId: number,
  id: string,
  syncExpiresAt: Date | null,
) {
  const existing = await readLocalConversation(userId, id);
  if (existing)
    await upsertLocalConversation(userId, { ...existing, syncExpiresAt });
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
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: SyncArgs) => {
      const userId = auth.data?.id;
      const payload =
        args.payload ??
        (userId != null
          ? await buildSyncPayload(userId, args.kind, args.id)
          : undefined);

      const result = handleElysia(
        await rpc.api.ai.sync({ kind: args.kind })({ id: args.id }).post({
          days: args.days,
          payload,
          keepExpiry: args.keepExpiry,
        }),
      ) as SyncBundle;

      const row = bundleSyncRow(result);
      if (args.kind === "conversations" && userId != null) {
        await mirrorConvExpiry(userId, args.id, row?.syncExpiresAt ?? null);
      }
      patchSyncStateCache(qc, args.kind, args.id, row);
      return result;
    },
    onError: (e) => handleError(e, t),
  });
}

type RemoveArgs = { kind: SyncKindName; id: string };

export function useRemoveSyncMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: RemoveArgs) => {
      const result = handleElysia(
        await rpc.api.ai.sync({ kind: args.kind })({ id: args.id }).delete(),
      );
      const userId = auth.data?.id;
      if (args.kind === "conversations" && userId != null) {
        await mirrorConvExpiry(userId, args.id, null);
      }
      patchSyncStateCache(qc, args.kind, args.id, null);
      return result;
    },
    onError: (e) => handleError(e, t),
  });
}

// Hydrator seeds pending rows; mutations + drains invalidate.
function usePendingSyncQuery() {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.pendingSync(),
    queryFn: async () => readPendingSync(auth.data!.id),
    enabled: !!auth.data,
    staleTime: Infinity,
  });
}

// Reads the current syncExpiresAt + pending-queue row (if any) for one entity
// so SyncBadge can render synced/pending/failed in one place without fanning
// out N independent queries.
export function useSyncStateForRow(kind: SyncKindName, id: string) {
  const stateQuery = useSyncStateQuery();
  const pendingQuery = usePendingSyncQuery();
  const stateRow = stateQuery.data?.[kind]?.find((r) => r.id === id);
  const pendingRow = pendingQuery.data?.find(
    (r) => r.kind === kind && r.id === id,
  );
  return {
    isLoaded: stateQuery.isSuccess,
    syncExpiresAt: stateRow?.syncExpiresAt ?? null,
    pending: (pendingRow ?? null) as PendingSyncRow | null,
  };
}

// Manual retry mutation: resets attempts on dead-letter rows (or specified
// targets) and re-drains. Used by SyncBadge "Retry" button and DLQ toast.
export function useDrainPendingMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (
      targets?: Array<{ kind: SyncKindName; id: string }>,
    ) => {
      // Caller gates on auth.data; mutation is only enabled when logged in.
      return retryPendingTargets(auth.data!.id, qc, targets);
    },
    onSuccess: (result) => {
      if (result.dead.length === 0 && result.succeeded > 0) {
        toast.success(t("SYNC.RETRY_SUCCESS"));
      } else if (result.dead.length > 0) {
        toast.error(t("SYNC.DLQ_RETRY_FAILED"));
      }
    },
    onError: (e) => handleError(e, t),
  });
}
