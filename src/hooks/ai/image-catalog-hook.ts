"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { CatalogSearchQuery } from "@/lib/validation/image";
import { handleElysia } from "@/lib/utils/base";
import {
  imageModelStore,
  rememberLocalImageModel,
} from "@/lib/db/client/data/image/image";
import {
  deleteImagePreset,
  listImagePresets,
  saveImagePreset,
  type ImagePresetInput,
} from "@/lib/db/client/data/image/image-presets";
import { useQuery } from "@tanstack/react-query";

export function useLoraCatalogQuery(query?: CatalogSearchQuery) {
  return useElysiaQuery(
    queryKeys.loraCatalog(query),
    () => rpc.api.ai.image.catalog.loras.get({ query: query ?? {} }),
    // 8-22s upstream: the caller MUST surface isFetching, or stale rows with no
    // pending indicator read as a dead search box.
    { placeholderData: (prev) => prev },
  );
}

export function useCivitaiVersionsMutation() {
  return useApiMutation({
    mutationFn: async (query: string) =>
      handleElysia(await rpc.api.ai.image["civitai-versions"].post({ query })),
  });
}

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

export function useCheckpointSearchQuery(q: string) {
  return useElysiaQuery(
    queryKeys.checkpointSearch(q),
    () => rpc.api.ai.image.checkpoints.get({ query: { q } }),
    { enabled: q.trim().length >= 2 },
  );
}

export function useSavedImageModelsQuery() {
  return useQuery({
    queryKey: queryKeys.savedImageModels(),
    queryFn: () => imageModelStore.list(),
  });
}

export function useRememberImageModelMutation() {
  return useApiMutation({
    mutationFn: (model: {
      air: string;
      name: string;
      architecture: string | null;
      heroImage: string | null;
      nsfwLevel: number | null;
    }) => rememberLocalImageModel(model),
    invalidates: [queryKeys.savedImageModels()],
  });
}

export function useImagePresetsQuery() {
  return useQuery({
    queryKey: queryKeys.imagePresets(),
    queryFn: () => listImagePresets(),
  });
}

export function useSaveImagePresetMutation() {
  return useApiMutation({
    mutationFn: (input: ImagePresetInput) => saveImagePreset(input),
    invalidates: [queryKeys.imagePresets()],
  });
}

export function useDeleteImagePresetMutation() {
  return useApiMutation({
    mutationFn: (id: string) => deleteImagePreset(id),
    invalidates: [queryKeys.imagePresets()],
  });
}
