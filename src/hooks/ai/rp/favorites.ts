"use client";

import { useApiMutation } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import {
  setLocalFavorite,
  type RpFavoriteKind,
} from "@/lib/db/client/data/rp/rp";

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
  return useApiMutation({
    mutationFn: async (args: { id: string; isFavorite: boolean }) => {
      await setLocalFavorite(kind, args.id, args.isFavorite);
      return args;
    },
    invalidates: (args) => [
      FAVORITE_KEYS[kind].list(),
      FAVORITE_KEYS[kind].item(args.id),
    ],
  });
}
