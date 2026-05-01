import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { conversations, media } from "@/lib/db/schema";
import { mediaKey, uploadToR2 } from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import {
  MAX_PDF_TEXT_CHARS,
  MAX_USER_UPLOAD_BYTES,
} from "@/lib/validation/media";
import { eq, sql } from "drizzle-orm";
import { extractText, getDocumentProxy } from "unpdf";

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    const text = (
      Array.isArray(result.text) ? result.text.join("\n\n") : result.text
    ).trim();
    if (!text) return null;
    return text.length > MAX_PDF_TEXT_CHARS
      ? text.slice(0, MAX_PDF_TEXT_CHARS)
      : text;
  } catch (err) {
    logger.warn("PDF text extraction failed", {
      context: "media.pdf",
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function uploadMedia(
  file: File,
  convId: string,
  requestUserId: number = 0,
) {
  const db = getDb();
  const convRows = await db
    .select({ userId: conversations.userId })
    .from(conversations)
    .where(eq(conversations.id, convId))
    .limit(1);

  const userId = convRows[0]?.userId ?? requestUserId;
  const isGuest = userId === 0;

  if (convRows.length === 0) {
    await db
      .insert(conversations)
      .values({ id: convId, userId, model: "" })
      .onConflictDoNothing();
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!isGuest) {
    const rows = await db
      .select({ total: sql<number>`COALESCE(SUM(${media.sizeBytes}), 0)` })
      .from(media)
      .where(eq(media.userId, userId));
    const current = Number(rows[0]?.total ?? 0);
    if (current + buffer.length > MAX_USER_UPLOAD_BYTES) {
      throw new Error(msg("ERRORS.STORAGE_QUOTA_EXCEEDED"));
    }
  }

  const key = mediaKey(isGuest ? "guest" : "user", convId, uid(8), uid(8));
  const { url, mime } = await uploadToR2(key, buffer, file.type);

  const extractedText =
    mime === "application/pdf" ? await extractPdfText(buffer) : null;

  await db.insert(media).values({
    userId,
    convId,
    r2Key: key,
    mimeType: mime,
    sizeBytes: buffer.length,
    extractedText,
  });

  return { url, mimeType: mime, sizeBytes: buffer.length };
}
