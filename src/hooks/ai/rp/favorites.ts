"use client";

import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import {
  setLocalFavorite,
  type RpFavoriteKind,
} from "@/lib/db/client/data/rp/rp";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

const FAVORITE_KEYS: Record<
  RpFavoriteKind,
  { list: () => readonly unknown[]; item: (id: string) => readonly unknown[] }
> = {
  character: { list: queryKeys.characters, item: queryKeys.character },
  persona: { list: queryKeys.personas, item: queryKeys.persona },
  lorebook: { list: queryKeys.lorebooks, item: queryKeys.lorebook },
  preset: { list: queryKeys.presets, item: queryKeys.preset },
  card: { list: queryKeys.cards, item: queryKeys.card },
};

// Writes the column directly rather than going through useUpdate, which stamps
// updatedAt and would re-sort the list on every star.
export function useToggleFavoriteMutation(kind: RpFavoriteKind) {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; isFavorite: boolean }) => {
      await setLocalFavorite(kind, args.id, args.isFavorite);
      return args;
    },
    onSuccess: (_data, args) => {
      const keys = FAVORITE_KEYS[kind];
      invalidateAndBroadcast(qc, [keys.list(), keys.item(args.id)]);
    },
    onError: (e) => handleError(e, t),
  });
}
