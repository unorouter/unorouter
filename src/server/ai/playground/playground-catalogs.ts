import {
  embeddingCatalog,
  loraCatalog,
  upscalerCatalog,
} from "@/lib/db/schema";
import { getDb } from "@/lib/db/server/client";
import type {
  EmbeddingCatalogQuery,
  LoraCatalogQuery,
  UpscalerCatalogQuery,
} from "@/lib/validation/playground";
import { and, asc, eq, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

async function listCatalog<T extends SQLiteTable>(
  table: T & {
    visible: SQLiteColumn;
    sortOrder: SQLiteColumn;
    name: SQLiteColumn;
  },
  filters: SQL[],
) {
  const items = await getDb()
    .select()
    .from(table)
    .where(and(eq(table.visible, true), ...filters))
    .orderBy(asc(table.sortOrder), asc(table.name));
  return { items };
}

export function listLoraCatalog(query: LoraCatalogQuery) {
  const filters: SQL[] = [];
  if (query.baseModel) filters.push(eq(loraCatalog.baseModel, query.baseModel));
  if (query.category) filters.push(eq(loraCatalog.category, query.category));
  return listCatalog(loraCatalog, filters);
}

export function listEmbeddingCatalog(query: EmbeddingCatalogQuery) {
  const filters: SQL[] = [];
  if (query.baseModel)
    filters.push(eq(embeddingCatalog.baseModel, query.baseModel));
  if (query.category)
    filters.push(eq(embeddingCatalog.category, query.category));
  return listCatalog(embeddingCatalog, filters);
}

export function listUpscalerCatalog(query: UpscalerCatalogQuery) {
  const filters: SQL[] = [];
  if (query.category)
    filters.push(eq(upscalerCatalog.category, query.category));
  return listCatalog(upscalerCatalog, filters);
}
