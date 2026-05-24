"use client";

import {
  readLocalConversation,
  readLocalConversationBundle,
} from "@/lib/db/client/data/chat";
import {
  readLocalGenerationSession,
  readLocalGenerationSessionBundle,
} from "@/lib/db/client/data/playground";
import { enqueuePending } from "@/lib/db/client/sync/pending-sync";
import { rpc } from "@/lib/rpc";
import type { RpSyncKind, SyncMergeMode } from "@/lib/validation/sync";
import { handleElysia } from "@/lib/utils/base";

export async function mirrorSyncedRow(
  userId: number,
  kind: RpSyncKind,
  id: string,
  payload: unknown,
  mergeMode?: SyncMergeMode,
) {
  try {
    handleElysia(
      await rpc.api.ai
        .sync({ kind })({ id })
        .post({ payload, keepExpiry: true, mergeMode }),
    );
  } catch (err) {
    await enqueuePending(userId, kind, id, "patch", err);
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

export async function mirrorConvIfSynced(
  userId: number | undefined,
  convId: string,
) {
  const conv = await readLocalConversation(userId, convId);
  if (conv?.syncExpiresAt == null) return;
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) return;
  if (userId) await mirrorSyncedRow(userId, "conversations", convId, bundle);
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

// Playground analog of mirrorConvIfSynced: pushes the whole session bundle
// (snapshots + image media) when the session opted into Turso sync.
export async function mirrorSessionIfSynced(
  userId: number | undefined,
  sessionId: string,
) {
  const session = await readLocalGenerationSession(userId, sessionId);
  if (session?.syncExpiresAt == null) return;
  const bundle = await readLocalGenerationSessionBundle(userId, sessionId);
  if (!bundle) return;
  if (userId)
    await mirrorSyncedRow(userId, "playgroundSessions", sessionId, bundle);
}
