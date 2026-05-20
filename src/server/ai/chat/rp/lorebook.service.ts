import { lorebookEntries, lorebooks } from "@/lib/db/schema";
import { getDb } from "@/lib/db/server/client";
import { serializeLorebookForExport } from "@/lib/playground/rp/lorebook-import";
import { uid } from "@/lib/utils/base";
import { assertFound } from "@/lib/utils/server";
import type { LorebookBody, LorebookEntryBody } from "@/lib/validation/rp";
import dayjs from "dayjs";
import { and, asc, desc, eq } from "drizzle-orm";

export async function listLorebooks(userId: number) {
  const db = getDb();
  return db
    .select()
    .from(lorebooks)
    .where(eq(lorebooks.userId, userId))
    .orderBy(desc(lorebooks.updatedAt));
}

export async function getLorebook(userId: number, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(lorebooks)
    .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
    .limit(1);
  assertFound(rows);
  const entries = await db
    .select()
    .from(lorebookEntries)
    .where(eq(lorebookEntries.lorebookId, id))
    .orderBy(asc(lorebookEntries.orderIndex));
  return { ...rows[0], entries };
}

export async function createLorebook(userId: number, body: LorebookBody) {
  const db = getDb();
  const id = uid();
  await db.insert(lorebooks).values({ id, userId, ...body });
  return getLorebook(userId, id);
}

export async function updateLorebook(
  userId: number,
  id: string,
  body: LorebookBody,
) {
  const db = getDb();
  const result = await db
    .update(lorebooks)
    .set({ ...body, updatedAt: dayjs().toDate() })
    .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
    .returning({ id: lorebooks.id });
  assertFound(result);
  return getLorebook(userId, id);
}

export async function deleteLorebook(userId: number, id: string) {
  const db = getDb();
  const result = await db
    .delete(lorebooks)
    .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
    .returning({ id: lorebooks.id });
  assertFound(result);
  return { id };
}

async function ensureLorebookOwned(userId: number, lorebookId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: lorebooks.id })
    .from(lorebooks)
    .where(and(eq(lorebooks.id, lorebookId), eq(lorebooks.userId, userId)))
    .limit(1);
  assertFound(rows);
}

export async function createEntry(
  userId: number,
  lorebookId: string,
  body: LorebookEntryBody,
) {
  await ensureLorebookOwned(userId, lorebookId);
  const db = getDb();
  const id = uid();
  await db.insert(lorebookEntries).values({ id, lorebookId, ...body });
  return getEntry(userId, lorebookId, id);
}

async function getEntry(userId: number, lorebookId: string, entryId: string) {
  await ensureLorebookOwned(userId, lorebookId);
  const db = getDb();
  const rows = await db
    .select()
    .from(lorebookEntries)
    .where(
      and(
        eq(lorebookEntries.id, entryId),
        eq(lorebookEntries.lorebookId, lorebookId),
      ),
    )
    .limit(1);
  assertFound(rows);
  return rows[0];
}

export async function updateEntry(
  userId: number,
  lorebookId: string,
  entryId: string,
  body: LorebookEntryBody,
) {
  await ensureLorebookOwned(userId, lorebookId);
  const db = getDb();
  const result = await db
    .update(lorebookEntries)
    .set({ ...body, updatedAt: dayjs().toDate() })
    .where(
      and(
        eq(lorebookEntries.id, entryId),
        eq(lorebookEntries.lorebookId, lorebookId),
      ),
    )
    .returning({ id: lorebookEntries.id });
  assertFound(result);
  return getEntry(userId, lorebookId, entryId);
}

export async function deleteEntry(
  userId: number,
  lorebookId: string,
  entryId: string,
) {
  await ensureLorebookOwned(userId, lorebookId);
  const db = getDb();
  const result = await db
    .delete(lorebookEntries)
    .where(
      and(
        eq(lorebookEntries.id, entryId),
        eq(lorebookEntries.lorebookId, lorebookId),
      ),
    )
    .returning({ id: lorebookEntries.id });
  assertFound(result);
  return { id: entryId };
}

export async function exportLorebook(
  userId: number,
  id: string,
  format: "sillytavern" | "agnai" | "risu" | "ccv3" = "sillytavern",
): Promise<{ data: string; filename: string }> {
  const book = await getLorebook(userId, id);
  const json = serializeLorebookForExport(book, book.entries, format);
  const slug =
    book.name.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "lorebook";
  return { data: json, filename: `${slug}.${format}.json` };
}
