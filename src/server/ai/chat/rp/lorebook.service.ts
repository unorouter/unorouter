import { lorebookEntries, lorebooks } from "@/lib/db/schema";
import { getDb } from "@/lib/db/server/client";
import { serializeLorebookForExport } from "@/lib/ai/rp/lorebook-import";
import { exportSlug } from "@/lib/utils/base";
import { assertFound } from "@/lib/utils/server";
import { and, asc, eq } from "drizzle-orm";

async function getLorebook(userId: number, id: string) {
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

export async function exportLorebook(
  userId: number,
  id: string,
  format: "sillytavern" | "agnai" | "risu" | "ccv3" = "sillytavern",
): Promise<{ data: string; filename: string }> {
  const book = await getLorebook(userId, id);
  const json = serializeLorebookForExport(book, book.entries, format);
  const slug = exportSlug(book.name, "lorebook");
  return { data: json, filename: `${slug}.${format}.json` };
}
