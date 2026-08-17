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
import { asc, desc, eq } from "drizzle-orm";
import { getLocalDb } from "@/lib/db/client/client";
import {
  makeTableStore,
  replaceChildRows,
} from "@/lib/db/client/data/table-store";

import type { LocalAnyRow as AnyRow, LocalRowInput } from "@/lib/types";

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

const lorebookEntryStore = makeTableStore(lorebookEntries, lorebookEntries.id, {
  defaultOrderBy: asc(lorebookEntries.orderIndex),
});
export const readLocalCharacters = () => characterStore.list();
export const readLocalCharacter = (id: string) => characterStore.get(id);

export const readLocalPersonas = () => personaStore.list();
export const readLocalPersona = (id: string) => personaStore.get(id);

export const readLocalLorebooks = () => lorebookStore.list();

export const readLocalPresets = () => presetStore.list();
export const readLocalPreset = (id: string) => presetStore.get(id);

export const readLocalCards = () => cardStore.list();

export async function readLocalLorebook(id: string) {
  const local = await getLocalDb();
  if (!local) return null;
  const [lbRows, entries] = await Promise.all([
    local.db.select().from(lorebooks).where(eq(lorebooks.id, id)).limit(1),
    local.db
      .select()
      .from(lorebookEntries)
      .where(eq(lorebookEntries.lorebookId, id)),
  ]);
  if (!lbRows[0]) return null;
  return { ...lbRows[0], entries };
}

export async function readLocalLorebookBundle(id: string) {
  const lb = await readLocalLorebook(id);
  if (!lb) return null;
  const { entries, ...lorebook } = lb;
  return { lorebook, entries };
}

export async function readLocalCard(id: string) {
  const local = await getLocalDb();
  if (!local) return null;
  const [rows, chars, lbs] = await Promise.all([
    local.db.select().from(cards).where(eq(cards.id, id)).limit(1),
    local.db.select().from(cardCharacters).where(eq(cardCharacters.cardId, id)),
    local.db.select().from(cardLorebooks).where(eq(cardLorebooks.cardId, id)),
  ]);
  if (!rows[0]) return null;
  return { ...rows[0], cardCharacters: chars, cardLorebooks: lbs };
}
export const upsertLocalCharacter = (row: LocalRowInput & { id: string }) =>
  characterStore.upsert(row);
export const deleteLocalCharacter = (id: string) => characterStore.drop(id);

export const upsertLocalPersona = (row: LocalRowInput & { id: string }) =>
  personaStore.upsert(row);
export const deleteLocalPersona = (id: string) => personaStore.drop(id);

export const upsertLocalLorebook = (row: LocalRowInput & { id: string }) =>
  lorebookStore.upsert(row);
export const deleteLocalLorebook = (id: string) => lorebookStore.drop(id);

export const upsertLocalPreset = (row: LocalRowInput & { id: string }) =>
  presetStore.upsert(row);
export const deleteLocalPreset = (id: string) => presetStore.drop(id);

export const deleteLocalCard = (id: string) => cardStore.drop(id);

export const upsertLocalLorebookEntry = (
  row: LocalRowInput & { id: string; lorebookId: string },
) => lorebookEntryStore.upsert(row);
export const deleteLocalLorebookEntry = (entryId: string) =>
  lorebookEntryStore.drop(entryId);
export async function upsertLocalLorebookBundle(bundle: {
  lorebook: AnyRow;
  entries: AnyRow[];
}) {
  const local = await getLocalDb();
  if (!local) return;
  await lorebookStore.upsert(bundle.lorebook);
  await replaceChildRows(
    local.db,
    lorebookEntries,
    lorebookEntries.lorebookId,
    bundle.lorebook.id,
    bundle.entries,
  );
}

export async function upsertLocalCardBundle(bundle: {
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
}) {
  const local = await getLocalDb();
  if (!local) return;
  await cardStore.upsert(bundle.card);
  await replaceChildRows(
    local.db,
    cardCharacters,
    cardCharacters.cardId,
    bundle.card.id,
    bundle.cardCharacters,
    (row) => ({
      cardId: bundle.card.id,
      characterId: row.characterId,
      orderIndex: row.orderIndex ?? 0,
    }),
  );
  await replaceChildRows(
    local.db,
    cardLorebooks,
    cardLorebooks.cardId,
    bundle.card.id,
    bundle.cardLorebooks,
    (row) => ({
      cardId: bundle.card.id,
      lorebookId: row.lorebookId,
      orderIndex: row.orderIndex ?? 0,
    }),
  );
}
