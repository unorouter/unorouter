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
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export function useLoraCatalogQuery(query?: CatalogSearchQuery) {
  return useElysiaQuery(queryKeys.loraCatalog(query), () =>
    rpc.api.ai.image.catalog.loras.get({ query: query ?? {} }),
  );
}

export function useEmbeddingCatalogQuery(query?: CatalogSearchQuery) {
  return useElysiaQuery(queryKeys.embeddingCatalog(query), () =>
    rpc.api.ai.image.catalog.embeddings.get({ query: query ?? {} }),
  );
}

// Runware has no upscaler category; the closest catalog surface is vaes. Name kept so the
// existing picker does not need to change.
export function useUpscalerCatalogQuery(query?: CatalogSearchQuery) {
  return useElysiaQuery(queryKeys.upscalerCatalog(query), () =>
    rpc.api.ai.image.catalog.vaes.get({ query: query ?? {} }),
  );
}

// Resolving is deliberately a separate step from generating: Runware pins its own version
// ids, so a reference lifted from a Civitai URL often does not load, and finding that out
// here costs nothing instead of failing a generation the user already paid for.
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
