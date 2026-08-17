"use client";

import { jsPlugins } from "@/lib/db/schema/client";
import { desc } from "drizzle-orm";
import { makeTableStore } from "@/lib/db/client/data/table-store";
import type { LocalRowInput } from "@/lib/types";

const jsPluginStore = makeTableStore(jsPlugins, jsPlugins.id, {
  defaultOrderBy: desc(jsPlugins.updatedAt),
});

export const readLocalJsPlugins = () => jsPluginStore.list();
export const readLocalJsPlugin = (id: string) => jsPluginStore.get(id);
export const upsertLocalJsPlugin = (row: LocalRowInput & { id: string }) =>
  jsPluginStore.upsert(row);
export const deleteLocalJsPlugin = (id: string) => jsPluginStore.drop(id);
