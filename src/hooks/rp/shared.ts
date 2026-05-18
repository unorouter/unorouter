"use client";

import { enqueuePending } from "@/lib/db/client/pending-sync";
import { readLocalConversation, readLocalConversationBundle } from "@/lib/db/client/reads";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";

export type RpSyncKind =
  | "characters"
  | "personas"
  | "lorebooks"
  | "presets"
  | "cards"
  | "conversations";

export async function mirrorSyncedRow(
  userId: number,
  kind: RpSyncKind,
  id: string,
  payload: unknown,
) {
  try {
    handleElysia(
      await rpc.api.sync({ kind })({ id }).post({ payload, keepExpiry: true }),
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
    handleElysia(await rpc.api.sync({ kind })({ id }).delete());
  } catch (err) {
    await enqueuePending(userId, kind, id, "delete", err);
  }
}

export async function mirrorConvIfSynced(userId: number, convId: string) {
  const conv = await readLocalConversation(userId, convId);
  if (conv?.syncExpiresAt == null) return;
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) return;
  await mirrorSyncedRow(userId, "conversations", convId, bundle);
}

// Helper for hook bodies: pull userId from auth, default guest = 0.
export type EntityListResponse<TFn> = TFn extends (...args: never[]) => Promise<infer R>
  ? R extends { data: { data: infer D } }
    ? D
    : never
  : never;
