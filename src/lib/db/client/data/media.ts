"use client";

import { media } from "@/lib/db/schema/shared";
import { makeTableStore } from "./table-store";

const mediaStore = makeTableStore(media, media.id);

export const readLocalMedia = (userId: number | undefined, id: string) =>
  mediaStore.get(userId, id);

export const deleteLocalMedia = (userId: number | undefined, id: string) =>
  mediaStore.drop(userId, id);

// sync.service.ts uploads base64 bytes to R2 and stamps r2_url on Turso so cross-device pulls carry only a pointer.
export const upsertLocalMedia = (
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
) =>
  mediaStore.upsert(userId, {
    id: row.id,
    convId: row.convId ?? null,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    dataBase64: row.dataBase64 ?? null,
    r2Key: row.r2Key ?? null,
    r2Url: row.r2Url ?? null,
    extractedText: row.extractedText ?? null,
  });
