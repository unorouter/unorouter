"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { readLocalMedia, upsertLocalMedia } from "@/lib/db/client/data/media";
import { queryKeys } from "@/lib/react-query/keys";
import { arrayBufferToBase64 } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

// Resolves a media row to a renderable src.
// Local-first rule: if dataBase64 present, return data URI. Else if r2Key, fetch
// from R2 public URL, cache bytes locally for next render, return data URI.
// Returns null while loading or if no media exists.
export function useMediaSrc(mediaId: string | null | undefined): string | null {
  const auth = useAuthQuery();
  const userId = auth.data?.id ?? 0;
  const query = useQuery({
    queryKey: mediaId ? queryKeys.media(mediaId) : ["media", "none"],
    enabled: !!mediaId,
    queryFn: async () => {
      if (!mediaId) return null;
      const row = await readLocalMedia(userId, mediaId);
      if (!row) return null;
      if (row.dataBase64) {
        return `data:${row.mimeType};base64,${row.dataBase64}`;
      }
      if (!row.r2Key) return null;
      const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
      if (!base) return null;
      const res = await fetch(`${base}/${row.r2Key}`);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);
      await upsertLocalMedia(userId, {
        id: row.id,
        convId: row.convId,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        dataBase64: base64,
        r2Key: row.r2Key,
        r2Url: row.r2Url,
        extractedText: row.extractedText,
      });
      return `data:${row.mimeType};base64,${base64}`;
    },
  });
  return query.data ?? null;
}
