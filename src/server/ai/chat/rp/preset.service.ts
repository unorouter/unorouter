import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import { samplingPresets } from "@/lib/db/schema";
import { exportSlug } from "@/lib/utils/base";
import { and, desc, eq } from "drizzle-orm";

export async function listPresets(userId: number) {
  const db = getDb();
  return db
    .select()
    .from(samplingPresets)
    .where(eq(samplingPresets.userId, userId))
    .orderBy(desc(samplingPresets.updatedAt));
}

export async function getPreset(userId: number, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(samplingPresets)
    .where(and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)))
    .limit(1);
  assertFound(rows);
  return rows[0];
}

export async function exportPreset(
  userId: number,
  id: string,
): Promise<{ data: string; filename: string }> {
  const row = await getPreset(userId, id);
  const portable = {
    name: row.name,
    temperature: row.temperature,
    topP: row.topP,
    topK: row.topK,
    minP: row.minP,
    topA: row.topA,
    frequencyPenalty: row.frequencyPenalty,
    presencePenalty: row.presencePenalty,
    repetitionPenalty: row.repetitionPenalty,
    maxTokens: row.maxTokens,
    extraBody: row.extraBody,
    mainPrompt: row.mainPrompt,
    postHistory: row.postHistory,
    prefill: row.prefill,
    forceAlternateRoles: row.forceAlternateRoles,
    noSystemRole: row.noSystemRole,
    mustStartWithUserInput: row.mustStartWithUserInput,
    skipPrefillIfLastIsAssistant: row.skipPrefillIfLastIsAssistant,
    geminiBlockOff: row.geminiBlockOff,
    isDefault: row.isDefault,
  };
  const slug = exportSlug(row.name, "preset");
  return {
    data: JSON.stringify(portable, null, 2),
    filename: `${slug}.preset.json`,
  };
}
