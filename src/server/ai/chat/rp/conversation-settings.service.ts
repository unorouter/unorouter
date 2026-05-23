import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import { conversationSettings, conversations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getSettings(userId: number, convId: string) {
  const db = getDb();
  const ownership = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
    .limit(1);
  assertFound(ownership);

  const rows = await db
    .select()
    .from(conversationSettings)
    .where(eq(conversationSettings.convId, convId))
    .limit(1);
  return rows[0];
}
