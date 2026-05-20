"use client";

import {
  readLocalConversation,
  readLocalConversationBundle,
} from "@/lib/db/client/data/chat";
import { enqueuePending } from "@/lib/db/client/sync/pending-sync";
import { rpc } from "@/lib/rpc";
import type { RpSyncKind } from "@/lib/validation/sync";
import { handleElysia } from "@/lib/utils/base";

export async function mirrorSyncedRow(
  userId: number,
  kind: RpSyncKind,
  id: string,
  payload: unknown,
) {
  try {
    handleElysia(
      await rpc.api.ai
        .sync({ kind })({ id })
        .post({ payload, keepExpiry: true }),
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
