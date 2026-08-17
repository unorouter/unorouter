"use client";

import { mediaBlobUrl } from "@/lib/db/client/data/media/blob-url";
import { readLocalMedia } from "@/lib/db/client/data/media/media";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";

export function useMediaSrc(mediaId: string | null | undefined): string | null {
  const query = useQuery({
    queryKey: mediaId ? queryKeys.media(mediaId) : queryKeys.mediaNone(),
    enabled: !!mediaId,
    queryFn: async () => {
      if (!mediaId) return null;
      const row = await readLocalMedia(mediaId);
      if (!row?.dataBase64) return null;
      // Blob URL, not a data: URI: the base64 for a full-resolution image is a
      // multi-megabyte string that would sit in the query cache and re-parse on
      // every paint. Keyed by media id and deliberately never revoked here: the
      // same id renders in several places at once and across remounts, so a
      // revoke on unmount would break the live ones.
      return mediaBlobUrl(mediaId, row.dataBase64, row.mimeType);
    },
  });
  return query.data ?? null;
}
