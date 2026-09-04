"use client";

import { media } from "@/lib/db/schema/shared";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { makeTableStore } from "@/lib/db/client/data/table-store";

const mediaStore = makeTableStore(media, media.id);

export const readLocalMedia = (id: string) => mediaStore.get(id);

export const deleteLocalMedia = (id: string) => mediaStore.drop(id);

export const setLocalMediaDimensions = (
  id: string,
  width: number,
  height: number,
) => mediaStore.update(id, { width, height });

export const setLocalMediaFocal = (
  id: string,
  focalX: number | null,
  focalY: number | null,
) => mediaStore.update(id, { focalX, focalY });

export async function upsertLocalMedia(row: {
  id: string;
  convId?: string | null;
  mimeType: string;
  sizeBytes: number;
  dataBase64?: string | null;
  r2Key?: string | null;
  r2Url?: string | null;
  width?: number | null;
  height?: number | null;
  extractedText?: string | null;
  promptText?: string | null;
  focalX?: number | null;
  focalY?: number | null;
}) {
  logChatDebug("media.write", {
    id: row.id,
    bytes: row.dataBase64 ? row.dataBase64.length : (row.sizeBytes ?? 0),
    mime: row.mimeType,
    inline: !!row.dataBase64,
  });
  try {
    return await mediaStore.upsert({
      id: row.id,
      convId: row.convId ?? null,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      dataBase64: row.dataBase64 ?? null,
      r2Key: row.r2Key ?? null,
      r2Url: row.r2Url ?? null,
      // Omitted when unknown: the conflict-set overwrites every listed column,
      // which would null out already-measured dimensions.
      ...(row.width != null && row.height != null
        ? { width: row.width, height: row.height }
        : {}),
      ...(row.focalX != null && row.focalY != null
        ? { focalX: row.focalX, focalY: row.focalY }
        : {}),
      extractedText: row.extractedText ?? null,
      promptText: row.promptText ?? null,
    });
  } catch (e) {
    logChatDebug("media.write_error", {
      id: row.id,
      error: String(e).slice(0, 200),
    });
    throw e;
  }
}
