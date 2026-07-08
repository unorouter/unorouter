"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
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
import { and, asc, desc, eq } from "drizzle-orm";
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
export const readLocalCharacters = (userId: number | undefined) =>
  characterStore.list(userId);
export const readLocalCharacter = (userId: number | undefined, id: string) =>
  characterStore.get(userId, id);

export const readLocalPersonas = (userId: number | undefined) =>
  personaStore.list(userId);
export const readLocalPersona = (userId: number | undefined, id: string) =>
  personaStore.get(userId, id);

export const readLocalLorebooks = (userId: number | undefined) =>
  lorebookStore.list(userId);

export const readLocalPresets = (userId: number | undefined) =>
  presetStore.list(userId);
export const readLocalPreset = (userId: number | undefined, id: string) =>
  presetStore.get(userId, id);

export const readLocalCards = (userId: number | undefined) =>
  cardStore.list(userId);

export async function readLocalLorebook(
  userId: number | undefined,
  id: string,
) {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return null;
  const [lbRows, entries] = await Promise.all([
    local.db
      .select()
      .from(lorebooks)
      .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, uid)))
      .limit(1),
    local.db
      .select()
      .from(lorebookEntries)
      .where(eq(lorebookEntries.lorebookId, id)),
  ]);
  if (!lbRows[0]) return null;
  return { ...lbRows[0], entries };
}

export async function readLocalLorebookBundle(
  userId: number | undefined,
  id: string,
) {
  const lb = await readLocalLorebook(userId, id);
  if (!lb) return null;
  const { entries, ...lorebook } = lb;
  return { lorebook, entries };
}

export async function readLocalCard(userId: number | undefined, id: string) {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return null;
  const [rows, chars, lbs] = await Promise.all([
    local.db
      .select()
      .from(cards)
      .where(and(eq(cards.id, id), eq(cards.userId, uid)))
      .limit(1),
    local.db.select().from(cardCharacters).where(eq(cardCharacters.cardId, id)),
    local.db.select().from(cardLorebooks).where(eq(cardLorebooks.cardId, id)),
  ]);
  if (!rows[0]) return null;
  return { ...rows[0], cardCharacters: chars, cardLorebooks: lbs };
}
export const upsertLocalCharacter = (
  userId: number | undefined,
  row: LocalRowInput & { id: string },
) => characterStore.upsert(userId, row);
export const deleteLocalCharacter = (userId: number | undefined, id: string) =>
  characterStore.drop(userId, id);

export const upsertLocalPersona = (
  userId: number | undefined,
  row: LocalRowInput & { id: string },
) => personaStore.upsert(userId, row);
export const deleteLocalPersona = (userId: number | undefined, id: string) =>
  personaStore.drop(userId, id);

export const upsertLocalLorebook = (
  userId: number | undefined,
  row: LocalRowInput & { id: string },
) => lorebookStore.upsert(userId, row);
export const deleteLocalLorebook = (userId: number | undefined, id: string) =>
  lorebookStore.drop(userId, id);

export const upsertLocalPreset = (
  userId: number | undefined,
  row: LocalRowInput & { id: string },
) => presetStore.upsert(userId, row);
export const deleteLocalPreset = (userId: number | undefined, id: string) =>
  presetStore.drop(userId, id);

export const deleteLocalCard = (userId: number | undefined, id: string) =>
  cardStore.drop(userId, id);

export const upsertLocalLorebookEntry = (
  userId: number | undefined,
  row: LocalRowInput & { id: string; lorebookId: string },
) => lorebookEntryStore.upsert(userId, row, { scopeUser: false });
export const deleteLocalLorebookEntry = (
  userId: number | undefined,
  entryId: string,
) => lorebookEntryStore.drop(userId, entryId, { scopeUser: false });
export async function upsertLocalLorebookBundle(
  userId: number | undefined,
  bundle: { lorebook: AnyRow; entries: AnyRow[] },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await lorebookStore.upsert(userId, bundle.lorebook);
  await replaceChildRows(
    local.db,
    lorebookEntries,
    lorebookEntries.lorebookId,
    bundle.lorebook.id,
    bundle.entries,
  );
}

export async function upsertLocalCardBundle(
  userId: number | undefined,
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
