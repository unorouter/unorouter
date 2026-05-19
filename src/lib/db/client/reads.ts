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
import { getLocalDb } from "./client";
import { makeTableStore } from "./table-store";

// Returns null when the browser cannot mount the local DB (SSR, OPFS
// unavailable); hooks fall back to the server path in that case.

const characterStore = makeTableStore(characters, characters.id);
const personaStore = makeTableStore(personas, personas.id);
const lorebookStore = makeTableStore(lorebooks, lorebooks.id);
const presetStore = makeTableStore(samplingPresets, samplingPresets.id);
const cardStore = makeTableStore(cards, cards.id);
const conversationStore = makeTableStore(conversations, conversations.id);
const generationSessionStore = makeTableStore(
  playgroundSessions,
  playgroundSessions.id,
);
const conversationSettingsStore = makeTableStore(
  conversationSettings,
  conversationSettings.convId,
);

export const readLocalCharacters = (userId: number) =>
  characterStore.list(userId, { orderBy: desc(characters.updatedAt) });

export const readLocalCharacter = (userId: number, id: string) =>
  characterStore.get(userId, id);

export const readLocalPersonas = (userId: number) =>
  personaStore.list(userId, { orderBy: desc(personas.updatedAt) });

export const readLocalPersona = (userId: number, id: string) =>
  personaStore.get(userId, id);

export const readLocalLorebooks = (userId: number) =>
  lorebookStore.list(userId, { orderBy: desc(lorebooks.updatedAt) });

export const readLocalPresets = (userId: number) =>
  presetStore.list(userId, { orderBy: desc(samplingPresets.updatedAt) });

export const readLocalPreset = (userId: number, id: string) =>
  presetStore.get(userId, id);

export const readLocalCards = (userId: number) =>
  cardStore.list(userId, { orderBy: desc(cards.updatedAt) });

export const readLocalConversations = (userId: number) =>
  conversationStore.list(userId, { orderBy: desc(conversations.updatedAt) });

export const readLocalConversation = (userId: number, id: string) =>
  conversationStore.get(userId, id);

export const readLocalGenerationSessions = (userId: number) =>
  generationSessionStore.list(userId, {
    orderBy: desc(playgroundSessions.updatedAt),
  });

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
