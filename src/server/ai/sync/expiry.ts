import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import {
  cards,
  characters,
  conversations,
  lorebooks,
  personas,
  playgroundSessions,
  samplingPresets,
  userThemes,
} from "@/lib/db/schema/shared";
import { addDays } from "@/lib/utils/format/date";
import type { SyncKindName, SyncMergeMode } from "@/lib/validation/sync";
import { and, eq } from "drizzle-orm";
import { getSyncedBundle } from "./bundles";
import { readSyncExpiry } from "./kinds";
import { DEFAULT_TTL_DAYS, upsertHandlers } from "./upsert";

export type SyncRequestPayload = {
  days?: number;
  // Required for first sync or re-add after expiry. For resync of an extant
  // row, payload still wins (client is authoritative for any drift).
  payload?: unknown;
  // Mirror PATCH on save: keep existing expiry, refresh content only.
  keepExpiry?: boolean;
  // Conversations-only: controls how child arrays merge. Defaults to "replace"
  // for back-compat. "upsert" preserves rows not in payload (delta sync).
  // "append" inserts new rows without delete-first (hot-path append optimization).
  mergeMode?: SyncMergeMode;
};

export async function setSyncExpiry(
  userId: number,
  kind: SyncKindName,
  id: string,
  req: SyncRequestPayload,
) {
  const db = getDb();
  let expiresAt = addDays(req.days ?? DEFAULT_TTL_DAYS);
  if (req.keepExpiry) {
    const existing = await readSyncExpiry(userId, kind, id);
    if (existing) expiresAt = existing;
  }
  const handler = upsertHandlers[kind];
  await handler(db, userId, id, expiresAt, req.payload, req.mergeMode);
  return getSyncedBundle(userId, kind, id);
}

export async function clearSyncExpiry(
  userId: number,
  kind: SyncKindName,
  id: string,
) {
  const db = getDb();
  let result: { id: string }[] = [];
  switch (kind) {
    case "characters":
      result = await db
        .delete(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .returning({ id: characters.id });
      break;
    case "personas":
      result = await db
        .delete(personas)
        .where(and(eq(personas.id, id), eq(personas.userId, userId)))
        .returning({ id: personas.id });
      break;
    case "lorebooks":
      result = await db
        .delete(lorebooks)
        .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
        .returning({ id: lorebooks.id });
      break;
    case "presets":
      result = await db
        .delete(samplingPresets)
        .where(
          and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
        )
        .returning({ id: samplingPresets.id });
      break;
    case "cards":
      result = await db
        .delete(cards)
        .where(and(eq(cards.id, id), eq(cards.userId, userId)))
        .returning({ id: cards.id });
      break;
    case "conversations":
      result = await db
        .delete(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .returning({ id: conversations.id });
      break;
    case "playgroundSessions":
      result = await db
        .delete(playgroundSessions)
        .where(
          and(
            eq(playgroundSessions.id, id),
            eq(playgroundSessions.userId, userId),
          ),
        )
        .returning({ id: playgroundSessions.id });
      break;
    case "theme":
      // `id` ignored; user_themes is keyed by userId.
      result = (
        await db
          .delete(userThemes)
          .where(eq(userThemes.userId, userId))
          .returning({ userId: userThemes.userId })
      ).map((r) => ({ id: String(r.userId) }));
      break;
  }
  assertFound(result);
  return { id };
}
