"use client";

import { jsPlugins } from "@/lib/db/schema/client";
import { desc } from "drizzle-orm";
import { makeTableStore } from "@/lib/db/client/data/table-store";
import type { LocalRowInput } from "@/lib/types";

const jsPluginStore = makeTableStore(jsPlugins, jsPlugins.id, {
  defaultOrderBy: desc(jsPlugins.updatedAt),
});

export const readLocalJsPlugins = (userId: number | undefined) =>
  jsPluginStore.list(userId);
export const readLocalJsPlugin = (userId: number | undefined, id: string) =>
  jsPluginStore.get(userId, id);
export const upsertLocalJsPlugin = (
  userId: number | undefined,
  row: LocalRowInput & { id: string },
) => jsPluginStore.upsert(userId, row);
export const deleteLocalJsPlugin = (userId: number | undefined, id: string) =>
  jsPluginStore.drop(userId, id);
