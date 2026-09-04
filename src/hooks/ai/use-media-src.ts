"use client";

import { mediaBlobUrl } from "@/lib/db/client/data/media/blob-url";
import { readLocalMedia } from "@/lib/db/client/data/media/media";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";

function useMediaQuery(mediaId: string | null | undefined) {
  return useQuery({
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
      return {
        url: mediaBlobUrl(mediaId, row.dataBase64, row.mimeType),
        focalX: row.focalX,
        focalY: row.focalY,
      };
    },
  });
}

export function useMediaSrc(mediaId: string | null | undefined): string | null {
  return useMediaQuery(mediaId).data?.url ?? null;
}

// CSS object-position for an avatar, "50% 50%" until the user drags one.
export function useMediaFocal(mediaId: string | null | undefined): string {
  const data = useMediaQuery(mediaId).data;
  return focalToObjectPosition(data?.focalX, data?.focalY);
}

// The editor needs the raw pair, since a drag starts from the stored value.
export function useMediaFocalPoint(
  mediaId: string | null | undefined,
): { x: number; y: number } | undefined {
  const data = useMediaQuery(mediaId).data;
  if (data?.focalX == null || data?.focalY == null) return undefined;
  return { x: data.focalX, y: data.focalY };
}

export function focalToObjectPosition(
  x: number | null | undefined,
  y: number | null | undefined,
): string {
  return `${x ?? 50}% ${y ?? 50}%`;
}
