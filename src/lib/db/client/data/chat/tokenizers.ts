"use client";

import { getLocalDb } from "@/lib/db/client/client";
import { tokenizers } from "@/lib/db/schema/client";
import type { TokenizerKind } from "@/lib/ai/chat/tokenizer";
import { eq } from "drizzle-orm";

export type TokenizerCacheRow = {
  source: string;
  name: string;
  type: TokenizerKind;
  tokenizerJson: string | null;
  tokenizerConfig: string | null;
};

export async function getTokenizerCache(
  source: string,
): Promise<TokenizerCacheRow | null> {
  const local = await getLocalDb();
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(tokenizers)
    .where(eq(tokenizers.source, source))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    source: row.source,
    name: row.name,
    type: row.type,
    tokenizerJson: row.tokenizerJson ?? null,
    tokenizerConfig: row.tokenizerConfig ?? null,
  };
}

export async function putTokenizerCache(row: TokenizerCacheRow): Promise<void> {
  const local = await getLocalDb();
  if (!local) return;
  await local.db
    .insert(tokenizers)
    .values({
      source: row.source,
      name: row.name,
      type: row.type,
      tokenizerJson: row.tokenizerJson,
      tokenizerConfig: row.tokenizerConfig,
    })
    .onConflictDoUpdate({
      target: tokenizers.source,
      set: {
        name: row.name,
        type: row.type,
        tokenizerJson: row.tokenizerJson,
        tokenizerConfig: row.tokenizerConfig,
      },
    });
}
