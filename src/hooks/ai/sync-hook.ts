"use client";

import { setLocalSyncFlag } from "@/lib/db/client/sync/reconcile";
import { useElysiaQuery } from "@/hooks/use-elysia-query";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { buildSyncPayload } from "@/lib/db/client/sync/build-payload";
import { evictMediaBase64After } from "@/lib/db/client/sync/evict-media";
import { rehydrateParentMedia } from "@/lib/db/client/sync/rehydrate-media";
import {
  clearPending,
  readPendingSync,
  retryPendingTargets,
  type PendingSyncRow,
} from "@/lib/db/client/sync/pending-sync";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import type { SyncKindName } from "@/lib/validation/sync-constants";
import type { SyncBundle } from "@/server/ai/sync/bundles";
import type { SyncStateBulk } from "@/server/ai/sync/state";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// Hydrator seeds this; invalidations drive every later refetch (no polling).
function useSyncStateQuery() {
  const auth = useAuthQuery();
  return useElysiaQuery(
    queryKeys.syncState(),
    () => rpc.api.ai.sync.state.get(),
    { enabled: !!auth.data, staleTime: Infinity },
  );
}

type SyncStateRow = SyncStateBulk[SyncKindName][number];

type SyncEntity = {
  id?: string;
  userId?: number;
  syncExpiresAt: Date | string | number | null;
  updatedAt: Date | string;
};

// sync-state query enabled:false; mutations patch cache row directly
// (carries fresh expiry).
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

type SyncArgs = {
  kind: SyncKindName;
  id: string;
  payload?: unknown;
  days?: number;
};

export function useSyncMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: async (args: SyncArgs) => {
      const payload =
        args.payload ??
        (userId > GUEST_USER_ID
          ? await buildSyncPayload(userId, args.kind, args.id)
          : undefined);

      const result = handleElysia(
        await rpc.api.ai.sync({ kind: args.kind })({ id: args.id }).post({
          days: args.days,
          payload,
        }),
      ) as SyncBundle;

      const row = bundleSyncRow(result);
      if (userId > GUEST_USER_ID) {
        // Stamp the server-assigned expiry on the local row for EVERY kind;
        // without it the mirror gates (syncExpiresAt != null) stay closed on
        // the enrolling device and later edits never reach Turso.
        await setLocalSyncFlag(
          userId,
          args.kind,
          args.id,
          row?.syncExpiresAt ? new Date(row.syncExpiresAt) : null,
        );
        await evictMediaBase64After(userId, result);
        // Enrollment pushed the full payload; a queued outbox row is stale
        // (a leftover delete would clobber the row we just enrolled).
        await clearPending(userId, args.kind, args.id);
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
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: async (args: RemoveArgs) => {
      // Push devices evicted media base64 after R2 upload; the server purges
      // the R2 prefix on unsync, so pull the bytes back first.
      if (userId > GUEST_USER_ID && args.kind === "conversations") {
        await rehydrateParentMedia(userId, { convId: args.id });
      } else if (userId > GUEST_USER_ID && args.kind === "playgroundSessions") {
        await rehydrateParentMedia(userId, { playgroundSessionId: args.id });
      }
      const result = handleElysia(
        await rpc.api.ai.sync({ kind: args.kind })({ id: args.id }).delete(),
      );
      // Clear the local flag for every kind so the mirror gate closes
      // immediately (not only after the next reconcile sweep).
      if (userId > GUEST_USER_ID) {
        await setLocalSyncFlag(userId, args.kind, args.id, null);
      }
      // A queued patch draining after removal would re-enroll the row
      // (keepExpiry falls back to the default TTL when no expiry exists).
      if (userId > GUEST_USER_ID)
        await clearPending(userId, args.kind, args.id);
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

// Reads syncExpiresAt + pending row for SyncBadge in one query.
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

// Manual retry: resets attempts on DLQ rows; used by SyncBadge + DLQ toast.
export function useDrainPendingMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (targets?: Array<{ kind: SyncKindName; id: string }>) => {
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
