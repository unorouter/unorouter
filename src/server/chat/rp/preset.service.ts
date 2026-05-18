import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import { samplingPresets } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import type { SamplingPresetBody } from "@/lib/validation/rp";
import dayjs from "dayjs";
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

export async function createPreset(userId: number, body: SamplingPresetBody) {
  const db = getDb();
  const id = uid();
  await db.transaction(async (tx) => {
    if (body.isDefault) {
      await tx
        .update(samplingPresets)
        .set({ isDefault: false })
        .where(eq(samplingPresets.userId, userId));
    }
    await tx.insert(samplingPresets).values({
      id,
      userId,
      name: body.name,
      temperature: body.temperature ?? null,
      topP: body.topP ?? null,
      topK: body.topK ?? null,
      minP: body.minP ?? null,
      topA: body.topA ?? null,
      frequencyPenalty: body.frequencyPenalty ?? null,
      presencePenalty: body.presencePenalty ?? null,
      repetitionPenalty: body.repetitionPenalty ?? null,
      maxTokens: body.maxTokens ?? null,
      extraBody: body.extraBody ?? null,
      mainPrompt: body.mainPrompt ?? null,
      postHistory: body.postHistory ?? null,
      prefill: body.prefill ?? null,
      forceAlternateRoles: body.forceAlternateRoles ?? false,
      noSystemRole: body.noSystemRole ?? false,
      mustStartWithUserInput: body.mustStartWithUserInput ?? false,
      skipPrefillIfLastIsAssistant: body.skipPrefillIfLastIsAssistant ?? false,
      geminiBlockOff: body.geminiBlockOff ?? false,
      isDefault: body.isDefault ?? false,
    });
  });
  return getPreset(userId, id);
}

export async function updatePreset(
  userId: number,
  id: string,
  body: SamplingPresetBody,
) {
  const db = getDb();
  await db.transaction(async (tx) => {
    if (body.isDefault) {
      await tx
        .update(samplingPresets)
        .set({ isDefault: false })
        .where(eq(samplingPresets.userId, userId));
    }
    const result = await tx
      .update(samplingPresets)
      .set({
        name: body.name,
        temperature: body.temperature ?? null,
        topP: body.topP ?? null,
        topK: body.topK ?? null,
        minP: body.minP ?? null,
        topA: body.topA ?? null,
        frequencyPenalty: body.frequencyPenalty ?? null,
        presencePenalty: body.presencePenalty ?? null,
        repetitionPenalty: body.repetitionPenalty ?? null,
        maxTokens: body.maxTokens ?? null,
        extraBody: body.extraBody ?? null,
        mainPrompt: body.mainPrompt ?? null,
        postHistory: body.postHistory ?? null,
        prefill: body.prefill ?? null,
        forceAlternateRoles: body.forceAlternateRoles ?? false,
        noSystemRole: body.noSystemRole ?? false,
        mustStartWithUserInput: body.mustStartWithUserInput ?? false,
        skipPrefillIfLastIsAssistant:
          body.skipPrefillIfLastIsAssistant ?? false,
        geminiBlockOff: body.geminiBlockOff ?? false,
        isDefault: body.isDefault ?? false,
        updatedAt: dayjs().toDate(),
      })
      .where(
        and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
      )
      .returning({ id: samplingPresets.id });
    assertFound(result);
  });
  return getPreset(userId, id);
}

/**
 * Export a preset as a JSON string. Strips DB-only metadata (id, userId,
 * timestamps) so the file is portable across users / instances. Caller wraps
 * in a Response with appropriate headers.
 */
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
  const slug =
    row.name.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "preset";
  return {
    data: JSON.stringify(portable, null, 2),
    filename: `${slug}.preset.json`,
  };
}

export async function deletePreset(userId: number, id: string) {
  const db = getDb();
  const result = await db
    .delete(samplingPresets)
    .where(and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)))
    .returning({ id: samplingPresets.id });
  assertFound(result);
  return { id };
}
