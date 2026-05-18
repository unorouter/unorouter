"use client";

import {
  cardCharacters,
  cardLorebooks,
  cards,
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  conversationSettings,
  generationImages,
  generationLikes,
  generationSessions,
  generations,
  lorebookEntries,
  lorebooks,
  media,
  messageItems,
  messages,
  personas,
  samplingPresets,
} from "@/lib/db/schema/shared";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
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
    local.db
      .select()
      .from(lorebookEntries)
      .where(eq(lorebookEntries.lorebookId, id)),
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

export async function readLocalConversation(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function readLocalPersona(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function readLocalPreset(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(samplingPresets)
    .where(and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function readLocalCard(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const [rows, chars, lbs] = await Promise.all([
    local.db
      .select()
      .from(cards)
      .where(and(eq(cards.id, id), eq(cards.userId, userId)))
      .limit(1),
    local.db.select().from(cardCharacters).where(eq(cardCharacters.cardId, id)),
    local.db.select().from(cardLorebooks).where(eq(cardLorebooks.cardId, id)),
  ]);
  if (!rows[0]) return null;
  return { ...rows[0], cardCharacters: chars, cardLorebooks: lbs };
}

export async function readLocalGenerationSession(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(generationSessions)
    .where(
      and(eq(generationSessions.id, id), eq(generationSessions.userId, userId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function readLocalConversationBindings(
  userId: number,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const [chars, lbs] = await Promise.all([
    local.db
      .select()
      .from(conversationCharacters)
      .where(eq(conversationCharacters.convId, convId)),
    local.db
      .select()
      .from(conversationLorebooks)
      .where(eq(conversationLorebooks.convId, convId)),
  ]);
  return { conversationCharacters: chars, conversationLorebooks: lbs };
}

export async function readLocalMessageItems(userId: number, convId: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const msgs = await local.db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.convId, convId));
  if (msgs.length === 0) return [];
  const ids = msgs.map((m) => m.id);
  return local.db
    .select()
    .from(messageItems)
    .where(inArray(messageItems.messageId, ids))
    .orderBy(asc(messageItems.sequenceIndex));
}

export async function readLocalConversationMedia(
  userId: number,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(media)
    .where(and(eq(media.userId, userId), eq(media.convId, convId)));
}

export async function readLocalConversationBundle(
  userId: number,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const conv = await readLocalConversation(userId, convId);
  if (!conv) return null;
  const [settings, bindings, msgs, items, mediaRows] = await Promise.all([
    readLocalConversationSettings(userId, convId),
    readLocalConversationBindings(userId, convId),
    readLocalMessages(userId, convId),
    readLocalMessageItems(userId, convId),
    readLocalConversationMedia(userId, convId),
  ]);
  return {
    conversation: conv,
    settings: settings ?? null,
    conversationCharacters: bindings?.conversationCharacters ?? [],
    conversationLorebooks: bindings?.conversationLorebooks ?? [],
    messages: msgs ?? [],
    messageItems: items ?? [],
    media: mediaRows ?? [],
  };
}

export async function readLocalGenerationSessionBundle(
  userId: number,
  sessionId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const session = await readLocalGenerationSession(userId, sessionId);
  if (!session) return null;
  const gens = await local.db
    .select()
    .from(generations)
    .where(eq(generations.sessionId, sessionId));
  const genIds = gens.map((g) => g.id);
  const [imgs, likes] = genIds.length
    ? await Promise.all([
        local.db
          .select()
          .from(generationImages)
          .where(inArray(generationImages.generationId, genIds)),
        local.db
          .select()
          .from(generationLikes)
          .where(inArray(generationLikes.generationId, genIds)),
      ])
    : [[], []];
  return {
    session,
    generations: gens,
    generationImages: imgs,
    generationLikes: likes,
  };
}
