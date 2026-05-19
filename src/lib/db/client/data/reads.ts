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
  playgroundImages,
  playgroundLikes,
  playgroundSessions,
  playgrounds,
  lorebookEntries,
  lorebooks,
  media,
  messageItems,
  messages,
  personas,
  samplingPresets,
} from "@/lib/db/schema/shared";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getLocalDb } from "../client";
import { makeTableStore } from "../table-store";

// Returns null when the browser cannot mount the local DB (SSR, OPFS
// unavailable); hooks fall back to the server path in that case.

const characterStore = makeTableStore(characters, characters.id, {
  defaultOrderBy: desc(characters.updatedAt),
});
const personaStore = makeTableStore(personas, personas.id, {
  defaultOrderBy: desc(personas.updatedAt),
});
const lorebookStore = makeTableStore(lorebooks, lorebooks.id, {
  defaultOrderBy: desc(lorebooks.updatedAt),
});
const presetStore = makeTableStore(samplingPresets, samplingPresets.id, {
  defaultOrderBy: desc(samplingPresets.updatedAt),
});
const cardStore = makeTableStore(cards, cards.id, {
  defaultOrderBy: desc(cards.updatedAt),
});
const conversationStore = makeTableStore(conversations, conversations.id);
const generationSessionStore = makeTableStore(
  playgroundSessions,
  playgroundSessions.id,
  { defaultOrderBy: desc(playgroundSessions.updatedAt) },
);
const conversationSettingsStore = makeTableStore(
  conversationSettings,
  conversationSettings.convId,
);
const mediaStore = makeTableStore(media, media.id);

export const readLocalMedia = (userId: number, id: string) =>
  mediaStore.get(userId, id);

export const readLocalCharacters = (userId: number) =>
  characterStore.list(userId);

export const readLocalCharacter = (userId: number, id: string) =>
  characterStore.get(userId, id);

export const readLocalPersonas = (userId: number) =>
  personaStore.list(userId);

export const readLocalPersona = (userId: number, id: string) =>
  personaStore.get(userId, id);

export const readLocalLorebooks = (userId: number) =>
  lorebookStore.list(userId);

export const readLocalPresets = (userId: number) => presetStore.list(userId);

export const readLocalPreset = (userId: number, id: string) =>
  presetStore.get(userId, id);

export const readLocalCards = (userId: number) => cardStore.list(userId);

export const readLocalConversations = async (userId: number) => {
  const local = await getLocalDb(userId);
  if (!local) return [];
  const rows = await local.db
    .select()
    .from(conversations)
    .leftJoin(
      conversationSettings,
      eq(conversationSettings.convId, conversations.id),
    )
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
  return rows.map((r) => ({
    ...r.conversations,
    model: r.conversation_settings?.defaultModel ?? null,
  }));
};

export const readLocalConversation = async (userId: number, id: string) => {
  const [conv, settings] = await Promise.all([
    conversationStore.get(userId, id),
    conversationSettingsStore.get(userId, id, { scopeUser: false }),
  ]);
  if (!conv) return conv;
  return { ...conv, model: settings?.defaultModel ?? null };
};

export const readLocalGenerationSessions = (userId: number) =>
  generationSessionStore.list(userId);

const readLocalGenerationSession = (userId: number, id: string) =>
  generationSessionStore.get(userId, id);

export const readLocalConversationSettings = (
  userId: number,
  convId: string,
) => conversationSettingsStore.get(userId, convId, { scopeUser: false });

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

export async function readLocalMessages(userId: number, convId: string) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(messages)
    .where(eq(messages.convId, convId))
    .orderBy(messages.createdAt);
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

async function readLocalConversationMedia(
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
    .from(playgrounds)
    .where(eq(playgrounds.sessionId, sessionId));
  const genIds = gens.map((g) => g.id);
  const [imgs, likes] = genIds.length
    ? await Promise.all([
        local.db
          .select()
          .from(playgroundImages)
          .where(inArray(playgroundImages.playgroundId, genIds)),
        local.db
          .select()
          .from(playgroundLikes)
          .where(inArray(playgroundLikes.playgroundId, genIds)),
      ])
    : [[], []];
  return {
    session,
    playgrounds: gens,
    playgroundImages: imgs,
    playgroundLikes: likes,
  };
}
