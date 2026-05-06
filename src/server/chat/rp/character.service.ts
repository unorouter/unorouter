import { msg } from "@/lib/config/constants";
import { uploadToR2 } from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import { characters } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { CharacterBody } from "@/lib/validation/rp";
import { serverEnv } from "@/server/env";
import dayjs from "dayjs";
import { and, desc, eq } from "drizzle-orm";
import {
  exportCharacterCard,
  exportCharacterCardAsJson,
  parseCharacterCardFile,
} from "./character-card";

async function fetchAvatarBuffer(
  r2Key: string,
): Promise<{ data: Buffer; mime: string } | null> {
  if (!serverEnv.r2PublicUrl) return null;
  try {
    const res = await fetch(`${serverEnv.r2PublicUrl}/${r2Key}`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime =
      res.headers.get("content-type") ||
      (r2Key.endsWith(".webp")
        ? "image/webp"
        : r2Key.endsWith(".jpg") || r2Key.endsWith(".jpeg")
          ? "image/jpeg"
          : "image/png");
    return { data: buf, mime };
  } catch (err) {
    logger.warn("Avatar fetch failed", {
      context: "character.export",
      r2Key,
      error: String(err),
    });
    return null;
  }
}

export async function listCharacters(userId: number) {
  const db = getDb();
  return db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId))
    .orderBy(desc(characters.updatedAt));
}

export async function getCharacter(userId: number, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.userId, userId)))
    .limit(1);
  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return rows[0];
}

export async function createCharacter(userId: number, body: CharacterBody) {
  const db = getDb();
  const id = uid();
  await db.insert(characters).values({
    id,
    userId,
    name: body.name,
    avatarR2Key: body.avatarR2Key ?? null,
    description: body.description ?? null,
    personality: body.personality ?? null,
    scenario: body.scenario ?? null,
    firstMessage: body.firstMessage ?? null,
    exampleMessages: body.exampleMessages ?? null,
    systemPrompt: body.systemPrompt ?? null,
    postHistoryInstructions: body.postHistoryInstructions ?? null,
    defaultReasoningEffort: body.defaultReasoningEffort ?? null,
    tags: body.tags ?? null,
    nsfw: body.nsfw ?? false,
  });
  return getCharacter(userId, id);
}

export async function updateCharacter(
  userId: number,
  id: string,
  body: CharacterBody,
) {
  const db = getDb();
  const result = await db
    .update(characters)
    .set({
      name: body.name,
      avatarR2Key: body.avatarR2Key ?? null,
      description: body.description ?? null,
      personality: body.personality ?? null,
      scenario: body.scenario ?? null,
      firstMessage: body.firstMessage ?? null,
      exampleMessages: body.exampleMessages ?? null,
      systemPrompt: body.systemPrompt ?? null,
      postHistoryInstructions: body.postHistoryInstructions ?? null,
      defaultReasoningEffort: body.defaultReasoningEffort ?? null,
      tags: body.tags ?? null,
      nsfw: body.nsfw ?? false,
      updatedAt: dayjs().toDate(),
    })
    .where(and(eq(characters.id, id), eq(characters.userId, userId)))
    .returning({ id: characters.id });
  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return getCharacter(userId, id);
}

export async function deleteCharacter(userId: number, id: string) {
  const db = getDb();
  const result = await db
    .delete(characters)
    .where(and(eq(characters.id, id), eq(characters.userId, userId)))
    .returning({ id: characters.id });
  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return { id };
}

/**
 * Import a SillyTavern v1/v2 character card (PNG, WebP, or JSON). The image
 * payload (if any) becomes the avatar in R2 under `chat/characters/<charId>/`.
 */
export async function importCharacterCard(userId: number, file: File) {
  const { card, imageBuffer, imageMime } = await parseCharacterCardFile(file);

  const id = uid();
  let avatarR2Key: string | null = null;

  if (imageBuffer && imageMime) {
    const ext = imageMime === "image/webp" ? "webp" : "png";
    const key = `chat/characters/${userId}/${id}/avatar.${ext}`;
    try {
      await uploadToR2(key, imageBuffer, imageMime);
      avatarR2Key = key;
    } catch {
      avatarR2Key = null;
    }
  }

  const db = getDb();
  await db.insert(characters).values({
    id,
    userId,
    name: card.name,
    avatarR2Key,
    description: card.description ?? null,
    personality: card.personality ?? null,
    scenario: card.scenario ?? null,
    firstMessage: card.firstMessage ?? null,
    exampleMessages: card.exampleMessages ?? null,
    systemPrompt: card.systemPrompt ?? null,
    postHistoryInstructions: card.postHistoryInstructions ?? null,
    tags: card.tags ?? null,
  });

  return getCharacter(userId, id);
}

/**
 * Export a character as a Tavern PNG card, RisuAI CharX, Voxta package, or
 * raw CCv3 JSON. PNG re-embeds the avatar as the icon asset; JSON is a
 * pure metadata blob without the avatar.
 */
export async function exportCharacter(
  userId: number,
  id: string,
  format: "png" | "charx" | "voxta" | "json",
): Promise<{ data: Uint8Array; mimeType: string; ext: string }> {
  const row = await getCharacter(userId, id);

  if (format === "json") {
    return exportCharacterCardAsJson(row);
  }

  const avatar = row.avatarR2Key
    ? await fetchAvatarBuffer(row.avatarR2Key)
    : null;
  return exportCharacterCard(row, avatar, format);
}
