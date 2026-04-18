import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { conversations, media } from "@/lib/db/schema";
import { mediaKey, uploadToR2 } from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";
import { eq, sql } from "drizzle-orm";

const MAX_USER_BYTES = 100 * 1024 * 1024;

export async function uploadMedia(file: File, convId: string) {
  const db = getDb();
  const convRows = await db
    .select({ userId: conversations.userId })
    .from(conversations)
    .where(eq(conversations.id, convId))
    .limit(1);
  const userId = convRows[0]?.userId ?? 0;
  const isGuest = userId === 0;

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!isGuest) {
    const rows = await db
      .select({ total: sql<number>`COALESCE(SUM(${media.sizeBytes}), 0)` })
      .from(media)
      .where(eq(media.userId, userId));
    const current = Number(rows[0]?.total ?? 0);
    if (current + buffer.length > MAX_USER_BYTES) {
      throw new Error(msg("ERRORS.STORAGE_QUOTA_EXCEEDED"));
    }
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${uid(8)}.${ext}`;
  const key = mediaKey(isGuest ? "guest" : "user", convId, uid(8), filename);
  const url = await uploadToR2(key, buffer, file.type);
  await db.insert(media).values({
    userId,
    convId,
    r2Key: key,
    mimeType: file.type,
    sizeBytes: buffer.length,
  });

  return { url, mimeType: file.type, sizeBytes: buffer.length };
}
