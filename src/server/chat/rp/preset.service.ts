import { assertFound } from "@/lib/db/assertions";
import { getDb } from "@/lib/db/client";
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
    .where(
      and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
    )
    .limit(1);
  assertFound(rows);
  return rows[0];
}

export async function createPreset(
  userId: number,
  body: SamplingPresetBody,
) {
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

export async function deletePreset(userId: number, id: string) {
  const db = getDb();
  const result = await db
    .delete(samplingPresets)
    .where(
      and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
    )
    .returning({ id: samplingPresets.id });
  assertFound(result);
  return { id };
}
