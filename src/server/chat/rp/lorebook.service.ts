import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { lorebookEntries, lorebooks } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import type { LorebookBody, LorebookEntryBody } from "@/lib/validation/rp";
import dayjs from "dayjs";
import { and, asc, desc, eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Lorebook CRUD
// ---------------------------------------------------------------------------

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
  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
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
  await db.insert(lorebooks).values({
    id,
    userId,
    name: body.name,
    description: body.description ?? null,
    scanDepth: body.scanDepth ?? 4,
    tokenBudget: body.tokenBudget ?? 1500,
    recursiveScanning: body.recursiveScanning ?? false,
  });
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
    .set({
      name: body.name,
      description: body.description ?? null,
      scanDepth: body.scanDepth ?? 4,
      tokenBudget: body.tokenBudget ?? 1500,
      recursiveScanning: body.recursiveScanning ?? false,
      updatedAt: dayjs().toDate(),
    })
    .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
    .returning({ id: lorebooks.id });
  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return getLorebook(userId, id);
}

export async function deleteLorebook(userId: number, id: string) {
  const db = getDb();
  const result = await db
    .delete(lorebooks)
    .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
    .returning({ id: lorebooks.id });
  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return { id };
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

async function ensureLorebookOwned(userId: number, lorebookId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: lorebooks.id })
    .from(lorebooks)
    .where(and(eq(lorebooks.id, lorebookId), eq(lorebooks.userId, userId)))
    .limit(1);
  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
}

export async function createEntry(
  userId: number,
  lorebookId: string,
  body: LorebookEntryBody,
) {
  await ensureLorebookOwned(userId, lorebookId);
  const db = getDb();
  const id = uid();
  await db.insert(lorebookEntries).values({
    id,
    lorebookId,
    keys: body.keys,
    secondaryKeys: body.secondaryKeys ?? null,
    content: body.content,
    constant: body.constant ?? false,
    selective: body.selective ?? false,
    priority: body.priority ?? 100,
    position: body.position ?? "before_char",
    depth: body.depth ?? 4,
    enabled: body.enabled ?? true,
    orderIndex: body.orderIndex ?? 0,
  });
  return getEntry(userId, lorebookId, id);
}

export async function getEntry(
  userId: number,
  lorebookId: string,
  entryId: string,
) {
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
  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
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
    .set({
      keys: body.keys,
      secondaryKeys: body.secondaryKeys ?? null,
      content: body.content,
      constant: body.constant ?? false,
      selective: body.selective ?? false,
      priority: body.priority ?? 100,
      position: body.position ?? "before_char",
      depth: body.depth ?? 4,
      enabled: body.enabled ?? true,
      orderIndex: body.orderIndex ?? 0,
      updatedAt: dayjs().toDate(),
    })
    .where(
      and(
        eq(lorebookEntries.id, entryId),
        eq(lorebookEntries.lorebookId, lorebookId),
      ),
    )
    .returning({ id: lorebookEntries.id });
  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
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
  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return { id: entryId };
}
