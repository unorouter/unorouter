import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import { cardCharacters, cardLorebooks, cards } from "@/lib/db/schema";
import { exportSlug } from "@/lib/utils/base";
import { and, asc, desc, eq } from "drizzle-orm";

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
  const slug = exportSlug(card.name, "card");
  return {
    data: JSON.stringify(portable, null, 2),
    filename: `${slug}.card.json`,
  };
}
