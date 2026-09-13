"use client";

import {
  deleteSavedTheme,
  listSavedThemes,
  renameSavedTheme,
  saveTheme,
  type SavedThemeInput,
} from "@/lib/db/client/data/theme";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export function useSavedThemesQuery() {
  return useQuery({
    queryKey: queryKeys.savedThemes(),
    queryFn: () => listSavedThemes(),
  });
}

export function useSaveThemeMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SavedThemeInput) => saveTheme(input),
    onError: (e) => handleError(e, t),
    onSuccess: () => invalidateAndBroadcast(qc, [queryKeys.savedThemes()]),
  });
}

export function useRenameSavedThemeMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      renameSavedTheme(input.id, input.name),
    onError: (e) => handleError(e, t),
    onSuccess: () => invalidateAndBroadcast(qc, [queryKeys.savedThemes()]),
  });
}

export function useDeleteSavedThemeMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedTheme(id),
    onError: (e) => handleError(e, t),
    onSuccess: () => invalidateAndBroadcast(qc, [queryKeys.savedThemes()]),
  });
}
