"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { readLocalMedia } from "@/lib/db/client/data/media";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";

// Resolves a media row to a renderable src from local DB only.
// R2 bytes are fetched and cached into dataBase64 by the sync hydrator at
// startup (sync-state-hydrator.ts rehydrateMedia); this hook never hits R2.
// Returns null while loading, if no media exists, or if bytes not yet cached.
export function useMediaSrc(mediaId: string | null | undefined): string | null {
  const auth = useAuthQuery();
  const query = useQuery({
    queryKey: mediaId ? queryKeys.media(mediaId) : queryKeys.mediaNone(),
    enabled: !!mediaId,
    queryFn: async () => {
      if (!mediaId) return null;
      const row = await readLocalMedia(auth.data?.id, mediaId);
      if (!row?.dataBase64) return null;
      return `data:${row.mimeType};base64,${row.dataBase64}`;
    },
  });
  return query.data ?? null;
}
