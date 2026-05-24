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

// Single source for the read-syncExpiresAt + DELETE-or-queue dance. Caller
// supplies the local-delete step itself; this only handles the server-side
// mirror cleanup. Guests + local-only rows short-circuit (no-op).
//
// Pattern collapsed: chat-hook useDeleteConversationMutation,
// thread-list-adapter delete, factory useDelete, playground useDeleteSnapshot.
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

// Settings-only mirror: pushes only the conversation_settings row through
// the conv bundle handler in `upsert` merge mode so other arrays
// (messages, media, characters) stay untouched. Use this for model picker
// + slider edits + system prompt overrides on synced convs.
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
