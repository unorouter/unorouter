// Seed catalogs that get inserted after migrations on every startup. Each
// row uses ON CONFLICT DO NOTHING on its primary key so re-runs are
// idempotent and operator edits via SQL never get clobbered.
//
// To add a new seed: append to the relevant catalog array. To remove a
// row from production, delete the seed AND issue a one-off DELETE in the
// DB; this file's removal alone won't clean up rows that were already
// inserted.

import { error, log } from "console";
import { sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { loraCatalog } from "./schema";
import * as schema from "./schema";

type LoraSeed = typeof loraCatalog.$inferInsert;

// LoRAs we staged on the RunPod network volume at /workspace/models/loras/.
// Filename must match the on-disk filename exactly — LoraLoader.lora_name is
// patched verbatim into the ComfyUI workflow by the new-api adapter.
const LORA_SEEDS: LoraSeed[] = [
  {
    id: "sinfully-stylish-bold-lighting",
    name: "Sinfully Stylish - Bold Lighting",
    source: "hf",
    sourceId: "Naznut/Pony_LORAs",
    filename: "Sinfully_Stylish_dramitic_bold_lighting.safetensors",
    baseModel: "sdxl",
    category: "style",
    defaultWeight: 0.8,
    description: "Cinematic bold lighting style. Pony XL.",
    nsfw: false,
    sortOrder: 10,
  },
  {
    id: "sinfully-stylish-pony-v02",
    name: "Sinfully Stylish - Pony v0.2",
    source: "hf",
    sourceId: "Naznut/Pony_LORAs",
    filename: "sinfully_stylish_PONY_0.2.safetensors",
    baseModel: "sdxl",
    category: "style",
    defaultWeight: 0.8,
    description: "Photoreal-leaning style enhancer for Pony XL.",
    nsfw: false,
    sortOrder: 20,
  },
  {
    id: "expressive-h",
    name: "Expressive H",
    source: "hf",
    sourceId: "Naznut/Pony_LORAs",
    filename: "Expressive_H-000001.safetensors",
    baseModel: "sdxl",
    category: "concept",
    defaultWeight: 0.7,
    description: "Expression intensifier. Boosts facial / pose expressiveness.",
    nsfw: true,
    sortOrder: 30,
  },
  {
    id: "wlop-style",
    name: "wlop style",
    source: "hf",
    sourceId: "SirVeggie/wlop-pony-lora",
    filename: "wlop-000018-pony.safetensors",
    baseModel: "sdxl",
    category: "style",
    defaultWeight: 0.7,
    description: "Painterly illustration style after wlop. Trained on Pony.",
    nsfw: false,
    sortOrder: 40,
  },
  {
    id: "jinx-arcane",
    name: "Jinx (Arcane)",
    source: "hf",
    sourceId: "Naznut/Pony_LORAs",
    filename: "jinx.safetensors",
    baseModel: "sdxl",
    category: "character",
    defaultWeight: 0.85,
    description: "Jinx character LoRA from Arcane.",
    nsfw: false,
    sortOrder: 50,
  },
];

export async function runSeeds(
  db: LibSQLDatabase<typeof schema>,
): Promise<void> {
  // Skip the round-trip when the table already has at least one row. The
  // ON CONFLICT path below would still no-op in that case, but the size
  // check avoids an N-row INSERT on every cold start.
  try {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)` })
      .from(loraCatalog);
    if (Number(n) >= LORA_SEEDS.length) return;
  } catch {
    // Table missing or unreadable — let the inserts surface the error.
  }

  let inserted = 0;
  for (const row of LORA_SEEDS) {
    try {
      const result = await db
        .insert(loraCatalog)
        .values(row)
        .onConflictDoNothing()
        .returning({ id: loraCatalog.id });
      if (result.length > 0) inserted++;
    } catch (e) {
      error(`seed lora ${row.id} failed`, e);
    }
  }
  if (inserted > 0) log(`[seed] inserted ${inserted} lora_catalog rows`);
}
