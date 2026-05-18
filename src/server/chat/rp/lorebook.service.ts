import { msg } from "@/lib/config/constants";
import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import { lorebookEntries, lorebooks } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import type { LorebookBody, LorebookEntryBody } from "@/lib/validation/rp";
import dayjs from "dayjs";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  parseLorebookJson,
  serializeLorebookForExport,
} from "./lorebook-import";

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
    matchWholeWords: body.matchWholeWords ?? false,
    injectionRole: body.injectionRole ?? "user",
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
      matchWholeWords: body.matchWholeWords ?? false,
      injectionRole: body.injectionRole ?? "user",
      updatedAt: dayjs().toDate(),
    })
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

export async function importLorebook(userId: number, file: File) {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error(msg("ERRORS.REQUEST_FAILED"));
  }

  const parsed = parseLorebookJson(raw);
  if (!parsed) throw new Error(msg("ERRORS.REQUEST_FAILED"));

  const db = getDb();
  const id = uid();

  await db.transaction(async (tx) => {
    await tx.insert(lorebooks).values({
      id,
      userId,
      name: parsed.name,
      description: parsed.description ?? null,
      scanDepth: parsed.scanDepth ?? 4,
      tokenBudget: parsed.tokenBudget ?? 1500,
      recursiveScanning: parsed.recursiveScanning ?? false,
    });

    if (parsed.entries.length > 0) {
      await tx.insert(lorebookEntries).values(
        parsed.entries.map((e, i) => ({
          id: uid(),
          lorebookId: id,
          keys: e.keys,
          secondaryKeys: e.secondaryKeys ?? null,
          content: e.content,
          constant: e.constant,
          selective: e.selective,
          priority: e.priority,
          position: e.position,
          depth: e.depth,
          enabled: e.enabled,
          orderIndex: e.orderIndex ?? i,
        })),
      );
    }
  });

  return getLorebook(userId, id);
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
