"use client";

import { jsPlugins } from "@/lib/db/schema/client";
import { desc } from "drizzle-orm";
import { makeTableStore } from "@/lib/db/client/data/table-store";

export const jsPluginStore = makeTableStore(jsPlugins, jsPlugins.id, {
  defaultOrderBy: desc(jsPlugins.updatedAt),
});
