"use client";

import {
  fetchCustomProviderModels,
  normalizeBaseUrl,
} from "@/lib/ai/chat/custom-provider-id";
import { useQuery } from "@tanstack/react-query";
import {
  deleteLocalCustomProvider,
  readLocalCustomProvider,
  readLocalCustomProviders,
  upsertLocalCustomProvider,
} from "@/lib/db/client/data/rp/custom-providers";
import { queryKeys } from "@/lib/react-query/keys";
import { makeRpEntity } from "./rp/factory";
import type { CustomProviderRow } from "@/lib/db/schema/rows";
import type { CustomProviderBody } from "@/lib/validation/custom-provider";

const customProviders = makeRpEntity<
  CustomProviderRow,
  CustomProviderBody,
  CustomProviderBody
>({
  listKey: queryKeys.customProviders,
  itemKey: queryKeys.customProvider,
  readList: readLocalCustomProviders,
  readItem: readLocalCustomProvider,
  upsertLocal: upsertLocalCustomProvider,
  deleteLocal: deleteLocalCustomProvider,
});

export const useCustomProvidersQuery = customProviders.useList;
export const useCustomProviderQuery = customProviders.useItem;
export const useCreateCustomProviderMutation = customProviders.useCreate;
export const useUpdateCustomProviderMutation = customProviders.useUpdate;
export const useDeleteCustomProviderMutation = customProviders.useDelete;
export const useDuplicateCustomProviderMutation = customProviders.useDuplicate;

export type CatalogTarget = { baseUrl: string; apiKey: string; proxy: boolean };

// The key stays out of the cache key, so the cache never holds a secret.
export function useCustomProviderCatalogQuery(target: CatalogTarget | null) {
  const base = target ? normalizeBaseUrl(target.baseUrl) : "";
  return useQuery({
    queryKey: queryKeys.customProviderCatalog(base, target?.proxy ?? false),
    queryFn: () =>
      fetchCustomProviderModels(base, target?.apiKey ?? "", target?.proxy),
    enabled: base !== "",
    staleTime: 10 * 60_000,
    retry: false,
  });
}
