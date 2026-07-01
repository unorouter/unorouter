"use client";

import { media } from "@/lib/db/schema/shared";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { makeTableStore } from "@/lib/db/client/data/table-store";

const mediaStore = makeTableStore(media, media.id);

export const readLocalMedia = (userId: number | undefined, id: string) =>
  mediaStore.get(userId, id);

export const deleteLocalMedia = (userId: number | undefined, id: string) =>
  mediaStore.drop(userId, id);

export async function upsertLocalMedia(
  userId: number | undefined,
  row: {
    id: string;
    convId?: string | null;
    mimeType: string;
    sizeBytes: number;
    dataBase64?: string | null;
    r2Key?: string | null;
    r2Url?: string | null;
    extractedText?: string | null;
  },
) {
  // bytes = the image-bloat signal (inline base64 is what balloons the OPFS DB); logged per write.
  logChatDebug("media.write", {
    id: row.id,
    bytes: row.dataBase64 ? row.dataBase64.length : (row.sizeBytes ?? 0),
    mime: row.mimeType,
    inline: !!row.dataBase64,
  });
  try {
    return await mediaStore.upsert(userId, {
      id: row.id,
      convId: row.convId ?? null,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      dataBase64: row.dataBase64 ?? null,
      r2Key: row.r2Key ?? null,
      r2Url: row.r2Url ?? null,
      extractedText: row.extractedText ?? null,
    });
  } catch (e) {
    logChatDebug("media.write_error", {
      id: row.id,
      error: String(e).slice(0, 200),
    });
    throw e;
  }
}
