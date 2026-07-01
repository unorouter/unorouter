"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { readLocalMedia } from "@/lib/db/client/data/media/media";
import { queryKeys } from "@/lib/react-query/keys";
import { base64ToDataUri } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

// Local-only media -> src; null if not cached locally.
export function useMediaSrc(mediaId: string | null | undefined): string | null {
  const userId = useLocalUserId();
  const query = useQuery({
    queryKey: mediaId ? queryKeys.media(mediaId) : queryKeys.mediaNone(),
    enabled: !!mediaId,
    queryFn: async () => {
      if (!mediaId) return null;
      const row = await readLocalMedia(userId, mediaId);
      if (!row?.dataBase64) return null;
      return base64ToDataUri(row.dataBase64, row.mimeType);
    },
  });
  return query.data ?? null;
}
