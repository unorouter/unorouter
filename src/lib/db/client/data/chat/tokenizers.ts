"use client";

import { getLocalDb } from "@/lib/db/client/client";
import { tokenizers } from "@/lib/db/schema/client";
import { eq } from "drizzle-orm";

export async function getTokenizerCache(source: string) {
  const local = await getLocalDb();
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(tokenizers)
    .where(eq(tokenizers.source, source))
    .limit(1);
  return rows[0] ?? null;
}

export async function putTokenizerCache(
  row: typeof tokenizers.$inferInsert,
): Promise<void> {
  const local = await getLocalDb();
  if (!local) return;
  await local.db
    .insert(tokenizers)
    .values(row)
    .onConflictDoUpdate({ target: tokenizers.source, set: row });
}
