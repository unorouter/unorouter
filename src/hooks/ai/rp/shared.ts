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

export async function mirrorConvIfSynced(
  userId: number | undefined,
  convId: string,
) {
  const conv = await readLocalConversation(userId, convId);
  if (conv?.syncExpiresAt == null) return;
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) return;
  if (!userId) return;
  const result = await mirrorSyncedRow(
    userId,
    "conversations",
    convId,
    bundle,
  );
  await evictMediaBase64After(userId, result);
}

// Shallow conv-row patch (rename, title); skips bundle rebuild.
export async function mirrorConvPatchIfSynced(
  userId: number | undefined,
  convId: string,
  patch: { conversation: Record<string, unknown> },
) {
  const conv = await readLocalConversation(userId, convId);
  if (conv?.syncExpiresAt == null) return;
  if (!userId) return;
  await mirrorSyncedRow(userId, "conversations", convId, patch);
}

// Settings-only mirror in upsert mode; preserves messages/media/chars.
export async function mirrorConvSettingsIfSynced(
  userId: number | undefined,
  convId: string,
  settings: Record<string, unknown>,
) {
  const conv = await readLocalConversation(userId, convId);
  if (conv?.syncExpiresAt == null) return;
  if (!userId) return;
  await mirrorSyncedRow(
    userId,
    "conversations",
    convId,
    { settings: { ...settings, convId } },
    "upsert",
  );
}

type ConvDeltaPatch = {
  conversation?: Record<string, unknown>;
  messages?: Array<Record<string, unknown>>;
  messageItems?: Array<Record<string, unknown>>;
  requestLogs?: Array<Record<string, unknown>>;
};
export async function mirrorConvDeltaIfSynced(
  userId: number | undefined,
  convId: string,
  patch: ConvDeltaPatch,
  mergeMode: Exclude<SyncMergeMode, "replace">,
) {
  const conv = await readLocalConversation(userId, convId);
  if (conv?.syncExpiresAt == null) return;
  if (!userId) return;
  await mirrorSyncedRow(userId, "conversations", convId, patch, mergeMode);
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
