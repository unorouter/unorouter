import { msg } from "@/lib/config/constants";
import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import { personas } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import type { PersonaBody } from "@/lib/validation/rp";
import dayjs from "dayjs";
import { and, desc, eq } from "drizzle-orm";
import { parsePersonaJson } from "./persona-import";

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

export async function createPersona(userId: number, body: PersonaBody) {
  const db = getDb();
  const id = uid();
  await db.transaction(async (tx) => {
    if (body.isDefault) {
      await tx
        .update(personas)
        .set({ isDefault: false })
        .where(eq(personas.userId, userId));
    }
    await tx.insert(personas).values({
      id,
      userId,
      name: body.name,
      description: body.description ?? null,
      avatarR2Key: body.avatarR2Key ?? null,
      isDefault: body.isDefault ?? false,
    });
  });
  return getPersona(userId, id);
}

export async function updatePersona(
  userId: number,
  id: string,
  body: PersonaBody,
) {
  const db = getDb();
  await db.transaction(async (tx) => {
    if (body.isDefault) {
      await tx
        .update(personas)
        .set({ isDefault: false })
        .where(eq(personas.userId, userId));
    }
    const result = await tx
      .update(personas)
      .set({
        name: body.name,
        description: body.description ?? null,
        avatarR2Key: body.avatarR2Key ?? null,
        isDefault: body.isDefault ?? false,
        updatedAt: dayjs().toDate(),
      })
      .where(and(eq(personas.id, id), eq(personas.userId, userId)))
      .returning({ id: personas.id });
    assertFound(result);
  });
  return getPersona(userId, id);
}

export async function deletePersona(userId: number, id: string) {
  const db = getDb();
  const result = await db
    .delete(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)))
    .returning({ id: personas.id });
  assertFound(result);
  return { id };
}

// Accepts SillyTavern, RisuAI, or persona-settings-backup shape. Skips entries
// without a name. Never marks imported personas as default.
export async function importPersona(userId: number, file: File) {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error(msg("ERRORS.REQUEST_FAILED"));
  }

  const parsed = parsePersonaJson(raw);
  if (parsed.length === 0) throw new Error(msg("ERRORS.REQUEST_FAILED"));

  const db = getDb();
  const inserted: Array<typeof personas.$inferSelect> = [];
  for (const p of parsed) {
    const id = uid();
    await db.insert(personas).values({
      id,
      userId,
      name: p.name,
      description: p.description ?? null,
      isDefault: false,
    });
    const row = await getPersona(userId, id);
    inserted.push(row);
  }
  return inserted;
}
