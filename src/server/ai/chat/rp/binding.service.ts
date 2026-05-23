import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import {
  conversationCharacters,
  conversationLorebooks,
  conversations,
} from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

export async function getBindings(userId: number, convId: string) {
  const db = getDb();
  const ownership = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
    .limit(1);
  assertFound(ownership);

  const [chars, lbs] = await Promise.all([
    db
      .select()
      .from(conversationCharacters)
      .where(eq(conversationCharacters.convId, convId))
      .orderBy(asc(conversationCharacters.orderIndex)),
    db
      .select()
      .from(conversationLorebooks)
      .where(eq(conversationLorebooks.convId, convId))
      .orderBy(asc(conversationLorebooks.orderIndex)),
  ]);

  return { characters: chars, lorebooks: lbs };
}
