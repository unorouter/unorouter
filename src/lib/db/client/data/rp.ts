"use client";

import {
  cardCharacters,
  cardLorebooks,
  cards,
  characters,
  lorebookEntries,
  lorebooks,
  personas,
  samplingPresets,
} from "@/lib/db/schema/shared";
import { and, desc, eq } from "drizzle-orm";
import { getLocalDb } from "../client";
import { makeTableStore } from "./table-store";

type AnyRow = Record<string, unknown> & { id: string };
type LocalRowInput = Record<string, unknown>;

// --- Stores -------------------------------------------------------------

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
const lorebookEntryStore = makeTableStore(lorebookEntries, lorebookEntries.id);

// --- Reads --------------------------------------------------------------

export const readLocalCharacters = (userId: number) =>
  characterStore.list(userId);
export const readLocalCharacter = (userId: number, id: string) =>
  characterStore.get(userId, id);

export const readLocalPersonas = (userId: number) => personaStore.list(userId);
export const readLocalPersona = (userId: number, id: string) =>
  personaStore.get(userId, id);

export const readLocalLorebooks = (userId: number) =>
  lorebookStore.list(userId);

export const readLocalPresets = (userId: number) => presetStore.list(userId);
export const readLocalPreset = (userId: number, id: string) =>
  presetStore.get(userId, id);

export const readLocalCards = (userId: number) => cardStore.list(userId);

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

// --- Writes -------------------------------------------------------------

export const upsertLocalCharacter = (
  userId: number,
  row: LocalRowInput & { id: string },
) => characterStore.upsert(userId, row);
export const deleteLocalCharacter = (userId: number, id: string) =>
  characterStore.drop(userId, id);

export const upsertLocalPersona = (
  userId: number,
  row: LocalRowInput & { id: string },
) => personaStore.upsert(userId, row);
export const deleteLocalPersona = (userId: number, id: string) =>
  personaStore.drop(userId, id);

export const upsertLocalLorebook = (
  userId: number,
  row: LocalRowInput & { id: string },
) => lorebookStore.upsert(userId, row);
export const deleteLocalLorebook = (userId: number, id: string) =>
  lorebookStore.drop(userId, id);

export const upsertLocalPreset = (
  userId: number,
  row: LocalRowInput & { id: string },
) => presetStore.upsert(userId, row);
export const deleteLocalPreset = (userId: number, id: string) =>
  presetStore.drop(userId, id);

export const deleteLocalCard = (userId: number, id: string) =>
  cardStore.drop(userId, id);

export const upsertLocalLorebookEntry = (
  userId: number,
  row: LocalRowInput & { id: string; lorebookId: string },
) => lorebookEntryStore.upsert(userId, row, { scopeUser: false });
export const deleteLocalLorebookEntry = (userId: number, entryId: string) =>
  lorebookEntryStore.drop(userId, entryId, { scopeUser: false });

// --- Bundles ------------------------------------------------------------

export async function upsertLocalLorebookBundle(
  userId: number,
  bundle: { lorebook: AnyRow; entries: AnyRow[] },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await lorebookStore.upsert(userId, bundle.lorebook);
  await local.db
    .delete(lorebookEntries)
    .where(eq(lorebookEntries.lorebookId, bundle.lorebook.id));
  for (const entry of bundle.entries) {
    await lorebookEntryStore.upsert(userId, entry, { scopeUser: false });
  }
}

export async function upsertLocalCardBundle(
  userId: number,
  bundle: {
    card: AnyRow;
    cardCharacters: Array<{
      cardId: string;
      characterId: string;
      orderIndex?: number;
    }>;
    cardLorebooks: Array<{
      cardId: string;
      lorebookId: string;
      orderIndex?: number;
    }>;
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await cardStore.upsert(userId, bundle.card);
  await local.db
    .delete(cardCharacters)
    .where(eq(cardCharacters.cardId, bundle.card.id));
  for (const row of bundle.cardCharacters) {
    await local.db.insert(cardCharacters).values({
      cardId: bundle.card.id,
      characterId: row.characterId,
      orderIndex: row.orderIndex ?? 0,
    });
  }
  await local.db
    .delete(cardLorebooks)
    .where(eq(cardLorebooks.cardId, bundle.card.id));
  for (const row of bundle.cardLorebooks) {
    await local.db.insert(cardLorebooks).values({
      cardId: bundle.card.id,
      lorebookId: row.lorebookId,
      orderIndex: row.orderIndex ?? 0,
    });
  }
}
