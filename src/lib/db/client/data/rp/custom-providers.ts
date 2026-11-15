"use client";

import { customProviders } from "@/lib/db/schema/client";
import { desc } from "drizzle-orm";
import { makeTableStore } from "@/lib/db/client/data/table-store";

export const customProviderStore = makeTableStore(
  customProviders,
  customProviders.id,
  { defaultOrderBy: desc(customProviders.updatedAt) },
);
