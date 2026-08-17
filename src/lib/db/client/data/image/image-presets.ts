"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import { getLocalDb } from "@/lib/db/client/client";
import { type ImagePreset, imagePresets } from "@/lib/db/schema/client";
import { uid } from "@/lib/utils/base";
import { asc, eq } from "drizzle-orm";

export type ImagePresetInput = {
  name: string;
  model: string;
  prompt?: string | null;
  negativePrompt?: string | null;
  params?: ImagePreset["params"];
  loras?: ImagePreset["loras"];
  extraParams?: ImagePreset["extraParams"];
};

export async function listImagePresets(
  userId: number = GUEST_USER_ID,
): Promise<ImagePreset[]> {
  const client = await getLocalDb(userId);
  if (!client) return [];
  return client.db.select().from(imagePresets).orderBy(asc(imagePresets.name));
}

export async function saveImagePreset(
  input: ImagePresetInput,
  userId: number = GUEST_USER_ID,
): Promise<ImagePreset> {
  const client = await getLocalDb(userId);
  if (!client) throw new Error("local-db-unavailable");
  const db = client.db;
  const now = new Date();
  // Saving under a name that already exists overwrites it, so re-saving after a tweak
  // updates the preset the user is working on instead of growing a list of near-duplicates.
  const existing = await db
    .select()
    .from(imagePresets)
    .where(eq(imagePresets.name, input.name))
    .limit(1);

  const row: ImagePreset = {
    id: existing[0]?.id ?? uid(),
    name: input.name,
    model: input.model,
    prompt: input.prompt ?? null,
    negativePrompt: input.negativePrompt ?? null,
    params: input.params ?? null,
    loras: input.loras ?? null,
    extraParams: input.extraParams ?? null,
    createdAt: existing[0]?.createdAt ?? now,
    updatedAt: now,
  };

  await db
    .insert(imagePresets)
    .values(row)
    .onConflictDoUpdate({ target: imagePresets.id, set: row });
  return row;
}

export async function deleteImagePreset(
  id: string,
  userId: number = GUEST_USER_ID,
): Promise<void> {
  const client = await getLocalDb(userId);
  if (!client) return;
  await client.db.delete(imagePresets).where(eq(imagePresets.id, id));
}
