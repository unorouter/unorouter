"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { CatalogSearchQuery } from "@/lib/validation/playground";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  deleteLocalImageModel,
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
    // Hold the previous results while the next search resolves. Without this the list
    // emptied on every keystroke and the popup collapsed to its loading state and back,
    // which read as the panel jumping around while typing.
    { placeholderData: (prev) => prev },
  );
}

export function useEmbeddingCatalogQuery(query?: CatalogSearchQuery) {
  return useElysiaQuery(queryKeys.embeddingCatalog(query), () =>
    rpc.api.ai.image.catalog.embeddings.get({ query: query ?? {} }),
  );
}

// No upscaler-catalog hook: the backend has no such category, and pointing the picker at
// vaes filled it with an unrelated list whose selection was never sent anywhere.

// Resolving is deliberately a separate step from generating: Runware pins its own version
// ids, so a reference lifted from a Civitai URL often does not load, and finding that out
// here costs nothing instead of failing a generation the user already paid for.
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

// The LoRA twin of useCivitaiVersionsMutation. Runware indexes Civitai LoRAs the same way it
// does checkpoints, so a pasted link resolves identically; the catalog search alone cannot
// reach a specific model out of the ~277k it holds. A QUERY rather than a mutation because
// the picker resolves as the user types, and resolving the same link twice should be a cache
// hit rather than a second 8-to-22 second provider call.
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

export function useResolveCivitaiMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (query: string) => {
      const res = await rpc.api.ai.image["resolve-civitai"].post({ query });
      return handleElysia(res);
    },
    onError: (e) => handleError(e, t),
  });
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

export function useForgetImageModelMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: (air: string) => deleteLocalImageModel(userId, air),
    onError: (e) => handleError(e, t),
    onSuccess: () => invalidateAndBroadcast(qc, [queryKeys.savedImageModels()]),
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
