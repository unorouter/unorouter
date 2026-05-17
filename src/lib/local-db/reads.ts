"use client";

import {
  cards,
  characters,
  conversations,
  conversationSettings,
  generationSessions,
  lorebookEntries,
  lorebooks,
  messages,
  personas,
  samplingPresets,
} from "@/lib/db/schema/shared";
import { and, desc, eq } from "drizzle-orm";
import { getLocalDb } from "./client";

// ---------------------------------------------------------------------------
// Typed read helpers against the SQLocal mirror. Each function returns null
// when the browser cannot mount the local DB (SSR, OPFS unavailable). Hooks
// fall back to the server path in that case.
// ---------------------------------------------------------------------------

export async function readLocalCharacters(userId: number) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId))
    .orderBy(desc(characters.updatedAt));
}

export async function readLocalCharacter(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function readLocalPersonas(userId: number) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(personas)
    .where(eq(personas.userId, userId))
    .orderBy(desc(personas.updatedAt));
}

export async function readLocalLorebooks(userId: number) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(lorebooks)
    .where(eq(lorebooks.userId, userId))
    .orderBy(desc(lorebooks.updatedAt));
}

export async function readLocalLorebook(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const [lbRows, entries] = await Promise.all([
    local.db
      .select()
      .from(lorebooks)
      .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
      .limit(1),
    local.db.select().from(lorebookEntries).where(eq(lorebookEntries.lorebookId, id)),
  ]);
  if (!lbRows[0]) return null;
  return { ...lbRows[0], entries };
}

export async function readLocalPresets(userId: number) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(samplingPresets)
    .where(eq(samplingPresets.userId, userId))
    .orderBy(desc(samplingPresets.updatedAt));
}

export async function readLocalCards(userId: number) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(cards)
    .where(eq(cards.userId, userId))
    .orderBy(desc(cards.updatedAt));
}

export async function readLocalConversations(userId: number) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function readLocalConversationSettings(
  userId: number,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(conversationSettings)
    .where(eq(conversationSettings.convId, convId))
    .limit(1);
  return rows[0] ?? null;
}

export async function readLocalMessages(userId: number, convId: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(messages)
    .where(eq(messages.convId, convId))
    .orderBy(messages.createdAt);
}

export async function readLocalGenerationSessions(userId: number) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(generationSessions)
    .where(eq(generationSessions.userId, userId))
    .orderBy(desc(generationSessions.updatedAt));
}
