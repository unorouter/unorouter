import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import { personas } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function listPersonas(userId: number) {
  const db = getDb();
  return db
    .select()
    .from(personas)
    .where(eq(personas.userId, userId))
    .orderBy(desc(personas.updatedAt));
}

export async function getPersona(userId: number, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)))
    .limit(1);
  assertFound(rows);
  return rows[0];
}
