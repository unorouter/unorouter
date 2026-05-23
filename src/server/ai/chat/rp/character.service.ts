import { characters, media } from "@/lib/db/schema";
import { getDb } from "@/lib/db/server/client";
import {
  exportCharacterCard,
  exportCharacterCardAsJson,
} from "@/lib/ai/rp/character-card";
import { logger } from "@/lib/utils/logger";
import { assertFound } from "@/lib/utils/server";
import { serverEnv } from "@/server/env";
import { and, desc, eq } from "drizzle-orm";

async function fetchAvatarBuffer(
  r2Key: string,
  declaredMime: string | null,
): Promise<{ data: Uint8Array; mime: string } | null> {
  if (!serverEnv.r2PublicUrl) return null;
  try {
    const res = await fetch(`${serverEnv.r2PublicUrl}/${r2Key}`);
    if (!res.ok) return null;
    const data = new Uint8Array(await res.arrayBuffer());
    const mime = res.headers.get("content-type") || declaredMime || "image/png";
    return { data, mime };
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
  assertFound(rows);
  return rows[0];
}

// PNG re-embeds avatar as icon asset; JSON is metadata-only (no avatar).
export async function exportCharacter(
  userId: number,
  id: string,
  format: "png" | "charx" | "voxta" | "json",
): Promise<{ data: Uint8Array; mimeType: string; ext: string }> {
  const row = await getCharacter(userId, id);

  if (format === "json") {
    return exportCharacterCardAsJson(row);
  }

  let avatar: { data: Uint8Array; mime: string } | null = null;
  if (row.avatarMediaId) {
    const mediaRows = await getDb()
      .select({ r2Key: media.r2Key, mimeType: media.mimeType })
      .from(media)
      .where(and(eq(media.id, row.avatarMediaId), eq(media.userId, userId)))
      .limit(1);
    const m = mediaRows[0];
    if (m?.r2Key) {
      avatar = await fetchAvatarBuffer(m.r2Key, m.mimeType);
    }
  }
  return exportCharacterCard(row, avatar, format);
}
