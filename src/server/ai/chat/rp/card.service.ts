import { msg } from "@/lib/config/constants";
import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import {
  cardCharacters,
  cardLorebooks,
  cards,
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversationSettings,
  conversations,
  lorebooks,
  personas,
} from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import type { CardApplyBody, CardBody } from "@/lib/validation/rp";
import { dayjs } from "@/lib/utils/format/date";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

export async function listCards(userId: number) {
  const db = getDb();
  return db
    .select()
    .from(cards)
    .where(eq(cards.userId, userId))
    .orderBy(desc(cards.updatedAt));
}

export async function getCard(userId: number, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .limit(1);
  assertFound(rows);
  const card = rows[0];
  const charRows = await db
    .select({
      characterId: cardCharacters.characterId,
      orderIndex: cardCharacters.orderIndex,
    })
    .from(cardCharacters)
    .where(eq(cardCharacters.cardId, id))
    .orderBy(asc(cardCharacters.orderIndex));
  const lbRows = await db
    .select({
      lorebookId: cardLorebooks.lorebookId,
      orderIndex: cardLorebooks.orderIndex,
    })
    .from(cardLorebooks)
    .where(eq(cardLorebooks.cardId, id))
    .orderBy(asc(cardLorebooks.orderIndex));
  return {
    ...card,
    characterIds: charRows.map((r) => r.characterId),
    lorebookIds: lbRows.map((r) => r.lorebookId),
  };
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function assertOwnership(tx: Tx, userId: number, body: CardBody) {
  if (body.personaId) {
    const owned = await tx
      .select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.userId, userId), eq(personas.id, body.personaId)))
      .limit(1);
    if (owned.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  }
  if (body.characterIds.length > 0) {
    const owned = await tx
      .select({ id: characters.id })
      .from(characters)
      .where(
        and(
          eq(characters.userId, userId),
          inArray(characters.id, body.characterIds),
        ),
      );
    if (owned.length !== new Set(body.characterIds).size) {
      throw new Error(msg("ERRORS.NOT_FOUND"));
    }
  }
  if (body.lorebookIds.length > 0) {
    const owned = await tx
      .select({ id: lorebooks.id })
      .from(lorebooks)
      .where(
        and(
          eq(lorebooks.userId, userId),
          inArray(lorebooks.id, body.lorebookIds),
        ),
      );
    if (owned.length !== new Set(body.lorebookIds).size) {
      throw new Error(msg("ERRORS.NOT_FOUND"));
    }
  }
}

export async function createCard(userId: number, body: CardBody) {
  const db = getDb();
  const id = uid();
  const { characterIds, lorebookIds, ...cardFields } = body;
  await db.transaction(async (tx) => {
    await assertOwnership(tx, userId, body);
    await tx.insert(cards).values({ id, userId, ...cardFields });
    if (characterIds.length > 0) {
      await tx.insert(cardCharacters).values(
        characterIds.map((characterId, i) => ({
          cardId: id,
          characterId,
          orderIndex: i,
        })),
      );
    }
    if (lorebookIds.length > 0) {
      await tx.insert(cardLorebooks).values(
        lorebookIds.map((lorebookId, i) => ({
          cardId: id,
          lorebookId,
          orderIndex: i,
        })),
      );
    }
  });
  return getCard(userId, id);
}

export async function updateCard(userId: number, id: string, body: CardBody) {
  const db = getDb();
  const { characterIds, lorebookIds, ...cardFields } = body;
  await db.transaction(async (tx) => {
    await assertOwnership(tx, userId, body);
    const result = await tx
      .update(cards)
      .set({ ...cardFields, updatedAt: dayjs().toDate() })
      .where(and(eq(cards.id, id), eq(cards.userId, userId)))
      .returning({ id: cards.id });
    assertFound(result);
    await tx.delete(cardCharacters).where(eq(cardCharacters.cardId, id));
    if (characterIds.length > 0) {
      await tx.insert(cardCharacters).values(
        characterIds.map((characterId, i) => ({
          cardId: id,
          characterId,
          orderIndex: i,
        })),
      );
    }
    await tx.delete(cardLorebooks).where(eq(cardLorebooks.cardId, id));
    if (lorebookIds.length > 0) {
      await tx.insert(cardLorebooks).values(
        lorebookIds.map((lorebookId, i) => ({
          cardId: id,
          lorebookId,
          orderIndex: i,
        })),
      );
    }
  });
  return getCard(userId, id);
}

export async function deleteCard(userId: number, id: string) {
  const db = getDb();
  const result = await db
    .delete(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .returning({ id: cards.id });
  assertFound(result);
  return { id };
}

export async function exportCard(
  userId: number,
  id: string,
): Promise<{ data: string; filename: string }> {
  const card = await getCard(userId, id);
  const portable = {
    name: card.name,
    description: card.description,
    personaId: card.personaId,
    characterIds: card.characterIds,
    lorebookIds: card.lorebookIds,
  };
  const slug =
    card.name.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "card";
  return {
    data: JSON.stringify(portable, null, 2),
    filename: `${slug}.card.json`,
  };
}

// replace: drop current chars/lorebooks; merge: union, existing entries first.
// Persona is overwritten in both modes (a chat has at most one persona).
export async function applyCardToConversation(
  userId: number,
  cardId: string,
  body: CardApplyBody,
) {
  const db = getDb();
  const card = await getCard(userId, cardId);
  await db.transaction(async (tx) => {
    const owns = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, body.convId),
          eq(conversations.userId, userId),
        ),
      )
      .limit(1);
    if (owns.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    if (card.personaId) {
      await tx
        .update(conversationSettings)
        .set({ personaId: card.personaId, updatedAt: dayjs().toDate() })
        .where(eq(conversationSettings.convId, body.convId));
    }

    if (body.mode === "replace") {
      await tx
        .delete(conversationCharacters)
        .where(eq(conversationCharacters.convId, body.convId));
      await tx
        .delete(conversationLorebooks)
        .where(eq(conversationLorebooks.convId, body.convId));
    }

    const existingChars =
      body.mode === "merge"
        ? await tx
            .select({ characterId: conversationCharacters.characterId })
            .from(conversationCharacters)
            .where(eq(conversationCharacters.convId, body.convId))
            .orderBy(asc(conversationCharacters.orderIndex))
        : [];
    const existingCharIds = new Set(existingChars.map((r) => r.characterId));
    const finalCharIds = [
      ...existingChars.map((r) => r.characterId),
      ...card.characterIds.filter((id) => !existingCharIds.has(id)),
    ];
    if (body.mode === "merge") {
      await tx
        .delete(conversationCharacters)
        .where(eq(conversationCharacters.convId, body.convId));
    }
    if (finalCharIds.length > 0) {
      await tx.insert(conversationCharacters).values(
        finalCharIds.map((characterId, i) => ({
          convId: body.convId,
          characterId,
          orderIndex: i,
          isActive: true,
        })),
      );
    }

    const existingLbs =
      body.mode === "merge"
        ? await tx
            .select({ lorebookId: conversationLorebooks.lorebookId })
            .from(conversationLorebooks)
            .where(eq(conversationLorebooks.convId, body.convId))
            .orderBy(asc(conversationLorebooks.orderIndex))
        : [];
    const existingLbIds = new Set(existingLbs.map((r) => r.lorebookId));
    const finalLbIds = [
      ...existingLbs.map((r) => r.lorebookId),
      ...card.lorebookIds.filter((id) => !existingLbIds.has(id)),
    ];
    if (body.mode === "merge") {
      await tx
        .delete(conversationLorebooks)
        .where(eq(conversationLorebooks.convId, body.convId));
    }
    if (finalLbIds.length > 0) {
      await tx.insert(conversationLorebooks).values(
        finalLbIds.map((lorebookId, i) => ({
          convId: body.convId,
          lorebookId,
          orderIndex: i,
        })),
      );
    }
  });
  return { success: true };
}
