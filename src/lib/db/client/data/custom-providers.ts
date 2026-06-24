"use client";

import { customProviders } from "@/lib/db/schema/client";
import { desc } from "drizzle-orm";
import { makeTableStore } from "./table-store";
import type { LocalRowInput } from "@/lib/types";

const customProviderStore = makeTableStore(
  customProviders,
  customProviders.id,
  { defaultOrderBy: desc(customProviders.updatedAt) },
);

export const readLocalCustomProviders = (userId: number | undefined) =>
  customProviderStore.list(userId);
export const readLocalCustomProvider = (
  userId: number | undefined,
  id: string,
) => customProviderStore.get(userId, id);
export const upsertLocalCustomProvider = (
  userId: number | undefined,
  row: LocalRowInput & { id: string },
) => customProviderStore.upsert(userId, row);
export const deleteLocalCustomProvider = (
  userId: number | undefined,
  id: string,
) => customProviderStore.drop(userId, id);
