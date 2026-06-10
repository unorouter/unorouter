"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import { readLocalConversation } from "@/lib/db/client/data/chat";
import { readLocalGenerationSession } from "@/lib/db/client/data/playground";
import type { ConvSyncHint } from "@/lib/db/client/sync/build-payload";
import { drainSoon, enqueueSync } from "@/lib/db/client/sync/pending-sync";
import type { RpSyncKind } from "@/lib/validation/sync-constants";

// Single push path: every helper gates on sync state, enqueues an outbox row
// (kind, id, scope hint), and kicks the debounced drainer. Payloads are
// rebuilt from the local DB at drain time, so callers pass scope, never data.

export async function mirrorSyncedRow(
  userId: number,
  kind: RpSyncKind,
  id: string,
) {
  await enqueueSync(userId, kind, id, "patch");
  drainSoon(userId);
}

export async function deleteSyncedRow(
  userId: number,
  kind: RpSyncKind,
  id: string,
) {
  await enqueueSync(userId, kind, id, "delete");
  drainSoon(userId);
}

// Guests + local-only short-circuit.
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
  if (!userId || userId <= GUEST_USER_ID) return null;
  const conv = await readLocalConversation(userId, convId);
  return conv?.syncExpiresAt != null ? userId : null;
}

async function enqueueConv(
  userId: number | undefined,
  convId: string,
  hint: ConvSyncHint,
  msgIds?: string[],
) {
  const uid = await syncedConvUser(userId, convId);
  if (uid == null) return;
  await enqueueSync(uid, "conversations", convId, "patch", { hint, msgIds });
  drainSoon(uid);
}

// Full bundle: history rewrites (delete message, clear) and overrides saves.
export async function mirrorConvIfSynced(
  userId: number | undefined,
  convId: string,
) {
  await enqueueConv(userId, convId, "full");
}

// Conversation-row columns only (rename, drawer settings, model switch).
export async function mirrorConvRowIfSynced(
  userId: number | undefined,
  convId: string,
) {
  await enqueueConv(userId, convId, "row");
}

// Join tables only; messages/media never ride a bindings save.
export async function mirrorConvBindingsIfSynced(
  userId: number | undefined,
  convId: string,
) {
  await enqueueConv(userId, convId, "bindings");
}

// Message delta (new turn, edit, branch switch); withRow adds the
// conversation-row patch (updatedAt/vars/summary) to the same drain.
export async function mirrorConvMessagesIfSynced(
  userId: number | undefined,
  convId: string,
  msgIds: string[],
  withRow = false,
) {
  await enqueueConv(userId, convId, "msgs", msgIds);
  if (withRow) await enqueueConv(userId, convId, "row");
}

// Playground analog of mirrorConvIfSynced (always full bundle).
export async function mirrorSessionIfSynced(
  userId: number | undefined,
  sessionId: string,
) {
  if (!userId || userId <= GUEST_USER_ID) return;
  const session = await readLocalGenerationSession(userId, sessionId);
  if (session?.syncExpiresAt == null) return;
  await enqueueSync(userId, "playgroundSessions", sessionId, "patch");
  drainSoon(userId);
}
