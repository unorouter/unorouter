"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { CatalogSearchQuery } from "@/lib/validation/playground";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation } from "@tanstack/react-query";
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
