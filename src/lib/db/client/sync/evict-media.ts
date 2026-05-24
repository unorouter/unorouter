"use client";

import { upsertLocalMedia } from "../data/media";

type MediaRowLike = {
  id: string;
  convId?: string | null;
  mimeType: string;
  sizeBytes: number;
  dataBase64?: string | null;
  r2Key?: string | null;
  r2Url?: string | null;
  extractedText?: string | null;
};

type BundleLike = {
  media?: MediaRowLike[];
};

// Server uploads local `dataBase64` to R2 on sync push, stamps `r2Key`/`r2Url`,
// returns bundle with `dataBase64` nulled. Without eviction the client keeps
// base64 forever, doubling OPFS footprint and re-uploading on every push.
export async function evictMediaBase64After(
  userId: number,
  result: unknown,
): Promise<void> {
  if (!result || typeof result !== "object") return;
  const bundle = result as BundleLike;
  const media = bundle.media;
  if (!Array.isArray(media) || media.length === 0) return;
  for (const row of media) {
    if (!row || !row.r2Key || !row.r2Url) continue;
    await upsertLocalMedia(userId, { ...row, dataBase64: null });
  }
}
