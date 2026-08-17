"use client";

import { customProviders } from "@/lib/db/schema/client";
import { desc } from "drizzle-orm";
import { makeTableStore } from "@/lib/db/client/data/table-store";
import type { LocalRowInput } from "@/lib/types";

const customProviderStore = makeTableStore(
  customProviders,
  customProviders.id,
  { defaultOrderBy: desc(customProviders.updatedAt) },
);

export const readLocalCustomProviders = () => customProviderStore.list();
export const readLocalCustomProvider = (id: string) =>
  customProviderStore.get(id);
export const upsertLocalCustomProvider = (
  row: LocalRowInput & { id: string },
) => customProviderStore.upsert(row);
export const deleteLocalCustomProvider = (id: string) =>
  customProviderStore.drop(id);
