"use client";

import {
  deleteSavedTheme,
  listSavedThemes,
  renameSavedTheme,
  saveTheme,
  type SavedThemeInput,
} from "@/lib/db/client/data/theme";
import { useApiMutation } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";

export function useSavedThemesQuery() {
  return useQuery({
    queryKey: queryKeys.savedThemes(),
    queryFn: () => listSavedThemes(),
  });
}

const invalidates = [queryKeys.savedThemes()];

export function useSaveThemeMutation() {
  return useApiMutation({
    mutationFn: (input: SavedThemeInput) => saveTheme(input),
    invalidates,
  });
}

export function useRenameSavedThemeMutation() {
  return useApiMutation({
    mutationFn: (input: { id: string; name: string }) =>
      renameSavedTheme(input.id, input.name),
    invalidates,
  });
}

export function useDeleteSavedThemeMutation() {
  return useApiMutation({
    mutationFn: (id: string) => deleteSavedTheme(id),
    invalidates,
  });
}
