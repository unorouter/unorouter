"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  readLocalConversation,
  readLocalConversationBundle,
} from "@/lib/db/client/data/chat";
import {
  readLocalGenerationSession,
  readLocalGenerationSessionBundle,
} from "@/lib/db/client/data/playground";
import { evictMediaBase64After } from "@/lib/db/client/sync/evict-media";
import { enqueuePending } from "@/lib/db/client/sync/pending-sync";
import { rpc } from "@/lib/rpc";
import type { RpSyncKind, SyncMergeMode } from "@/lib/validation/sync";
import { handleElysia } from "@/lib/utils/base";

// Returns null on failure (already queued a pending-sync row via
// enqueuePending). Callers needing post-success work inspect the return.
export async function mirrorSyncedRow(
  userId: number,
  kind: RpSyncKind,
  id: string,
  payload: unknown,
  mergeMode?: SyncMergeMode,
): Promise<unknown | null> {
  try {
    const result = handleElysia(
      await rpc.api.ai
        .sync({ kind })({ id })
        .post({ payload, keepExpiry: true, mergeMode }),
    );
    return result;
  } catch (err) {
    await enqueuePending(userId, kind, id, "patch", err, {
      payload,
      mergeMode,
    });
    return null;
  }
}

export async function deleteSyncedRow(
  userId: number,
  kind: RpSyncKind,
  id: string,
) {
  try {
    handleElysia(await rpc.api.ai.sync({ kind })({ id }).delete());
  } catch (err) {
    await enqueuePending(userId, kind, id, "delete", err);
  }
}

// Read-expiry + DELETE-or-queue. Guests + local-only short-circuit.
export async function unmirrorIfSynced(
  userId: number | undefined,
  kind: RpSyncKind,
  id: string,
  wasSynced: boolean,
) {
  if (!userId || userId <= GUEST_USER_ID || !wasSynced) return;
  await deleteSyncedRow(userId, kind, id);
}

// Common gate for the conv mirrors: a concrete userId AND a synced local row.
async function syncedConvUser(
  userId: number | undefined,
  convId: string,
): Promise<number | null> {
  if (!userId) return null;
  const conv = await readLocalConversation(userId, convId);
  return conv?.syncExpiresAt != null ? userId : null;
}

export async function mirrorConvIfSynced(
  userId: number | undefined,
  convId: string,
) {
  const uid = await syncedConvUser(userId, convId);
  if (uid == null) return;
  const bundle = await readLocalConversationBundle(uid, convId);
  if (!bundle) return;
  // Not wire payload: `settings` duplicates the conversation row's columns;
  // `requestLogs` are server-persisted at stream finish for synced convs.
  const result = await mirrorSyncedRow(uid, "conversations", convId, {
    ...bundle,
    settings: undefined,
    requestLogs: undefined,
  });
  await evictMediaBase64After(uid, result);
}

// Shallow conv-row patch (rename, title); skips bundle rebuild.
export async function mirrorConvPatchIfSynced(
  userId: number | undefined,
  convId: string,
  patch: { conversation: Record<string, unknown> },
) {
  const uid = await syncedConvUser(userId, convId);
  if (uid != null) await mirrorSyncedRow(uid, "conversations", convId, patch);
}

// Settings-only mirror in upsert mode; preserves messages/media/chars.
export async function mirrorConvSettingsIfSynced(
  userId: number | undefined,
  convId: string,
  settings: Record<string, unknown>,
) {
  const uid = await syncedConvUser(userId, convId);
  if (uid == null) return;
  // Settings are conversation-row columns; ship them as a conversation patch.
  await mirrorSyncedRow(
    uid,
    "conversations",
    convId,
    { conversation: settings },
    "upsert",
  );
}

// Bindings-only mirror: REPLACE mode wipes + reinserts just the two join
// tables (the server upsert only touches sections present in the payload).
export async function mirrorConvBindingsIfSynced(
  userId: number | undefined,
  convId: string,
  bindings: {
    conversationCharacters: Array<Record<string, unknown>>;
    conversationLorebooks: Array<Record<string, unknown>>;
  },
) {
  const uid = await syncedConvUser(userId, convId);
  if (uid != null) await mirrorSyncedRow(uid, "conversations", convId, bindings);
}

type ConvDeltaPatch = {
  conversation?: Record<string, unknown>;
  messages?: Array<Record<string, unknown>>;
  messageItems?: Array<Record<string, unknown>>;
};
export async function mirrorConvDeltaIfSynced(
  userId: number | undefined,
  convId: string,
  patch: ConvDeltaPatch,
  mergeMode: Exclude<SyncMergeMode, "replace">,
) {
  const uid = await syncedConvUser(userId, convId);
  if (uid != null)
    await mirrorSyncedRow(uid, "conversations", convId, patch, mergeMode);
}

// Playground mirror analog of mirrorConvIfSynced.
export async function mirrorSessionIfSynced(
  userId: number | undefined,
  sessionId: string,
) {
  const session = await readLocalGenerationSession(userId, sessionId);
  if (session?.syncExpiresAt == null) return;
  const bundle = await readLocalGenerationSessionBundle(userId, sessionId);
  if (!bundle) return;
  if (!userId) return;
  const result = await mirrorSyncedRow(
    userId,
    "playgroundSessions",
    sessionId,
    bundle,
  );
  await evictMediaBase64After(userId, result);
}
