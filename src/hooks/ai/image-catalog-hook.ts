"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { CatalogSearchQuery } from "@/lib/validation/playground";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  readLocalImageModels,
  rememberLocalImageModel,
} from "@/lib/db/client/data/image/image";
import {
  deleteImagePreset,
  listImagePresets,
  saveImagePreset,
  type ImagePresetInput,
} from "@/lib/db/client/data/image/image-presets";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export function useLoraCatalogQuery(query?: CatalogSearchQuery) {
  return useElysiaQuery(
    queryKeys.loraCatalog(query),
    () => rpc.api.ai.image.catalog.loras.get({ query: query ?? {} }),
    // Hold the previous results while the next search resolves, so the list does not empty
    // and collapse the popup on every keystroke. The caller MUST surface isFetching with
    // this: the provider takes 8 to 22 seconds, and stale rows with no pending indicator
    // read as a search box that ignores what you type.
    { placeholderData: (prev) => prev },
  );
}

export function useEmbeddingCatalogQuery(query?: CatalogSearchQuery) {
  return useElysiaQuery(queryKeys.embeddingCatalog(query), () =>
    rpc.api.ai.image.catalog.embeddings.get({ query: query ?? {} }),
  );
}

// Resolving is a separate step from generating: Runware pins its own version ids, so a
// Civitai-sourced reference often does not load, and finding out here costs nothing.
export function useCivitaiVersionsMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (query: string) => {
      const res = await rpc.api.ai.image["civitai-versions"].post({ query });
      return handleElysia(res);
    },
    onError: (e) => handleError(e, t),
  });
}

// LoRA twin of useCivitaiVersionsMutation. A query, not a mutation: the picker resolves
// as the user types, and a repeat link should hit cache instead of a second 8-22s call.
export function useCivitaiLoraVersionsQuery(query: string | undefined) {
  return useElysiaQuery(
    queryKeys.civitaiLoraVersions(query ?? ""),
    () =>
      rpc.api.ai.image["civitai-lora-versions"].get({
        query: { q: query ?? "" },
      }),
    { enabled: !!query, placeholderData: (prev) => prev },
  );
}

// Debounced by the caller through the query key; a reference resolves to one model and a
// name searches the provider catalog, so one hook covers both.
export function useCheckpointSearchQuery(q: string) {
  return useElysiaQuery(
    queryKeys.checkpointSearch(q),
    () => rpc.api.ai.image.checkpoints.get({ query: { q } }),
    { enabled: q.trim().length >= 2 },
  );
}

export function useSavedImageModelsQuery() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.savedImageModels(),
    queryFn: () => readLocalImageModels(userId),
  });
}

export function useRememberImageModelMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: (model: {
      air: string;
      name: string;
      architecture: string | null;
      heroImage: string | null;
      nsfwLevel: number | null;
    }) => rememberLocalImageModel(userId, model),
    onError: (e) => handleError(e, t),
    onSuccess: () => invalidateAndBroadcast(qc, [queryKeys.savedImageModels()]),
  });
}

export function useImagePresetsQuery() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.imagePresets(),
    queryFn: () => listImagePresets(userId),
  });
}

export function useSaveImagePresetMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: (input: ImagePresetInput) => saveImagePreset(input, userId),
    onError: (e) => handleError(e, t),
    onSuccess: () => invalidateAndBroadcast(qc, [queryKeys.imagePresets()]),
  });
}

export function useDeleteImagePresetMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: (id: string) => deleteImagePreset(id, userId),
    onError: (e) => handleError(e, t),
    onSuccess: () => invalidateAndBroadcast(qc, [queryKeys.imagePresets()]),
  });
}
