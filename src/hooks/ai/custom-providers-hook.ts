"use client";

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
