"use client";

import type {
  ScopedTable,
  StoreConfig,
  StorePkValue,
  StoreRow,
} from "@/lib/types";
import type { InferSelectModel, SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { eq } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { getLocalDb } from "../client";

type LocalDb = {
  delete: (table: SQLiteTable) => { where: (cond: SQL) => Promise<unknown> };
  insert: (table: SQLiteTable) => {
    values: (row: never) => Promise<unknown>;
  };
};

export async function replaceChildRows<T>(
  db: LocalDb,
  table: SQLiteTable,
  fkColumn: SQLiteColumn,
  parentId: string,
  rows: T[],
  mapRow?: (row: T, index: number) => Record<string, unknown>,
): Promise<void> {
  await db.delete(table).where(eq(fkColumn, parentId));
  for (let i = 0; i < rows.length; i++) {
    const values = mapRow ? mapRow(rows[i], i) : rows[i];
    await db.insert(table).values(values as never);
  }
}

type LocalInsertable = {
  insert: (table: SQLiteTable) => {
    values: (row: never) => {
      onConflictDoUpdate: (opts: {
        target: SQLiteColumn | SQLiteColumn[];
        set: never;
      }) => Promise<unknown>;
    };
  };
};

export async function mergeChildRows<T>(
  db: LocalInsertable,
  table: SQLiteTable,
  pk: SQLiteColumn | SQLiteColumn[],
  rows: T[],
  mapRow?: (row: T, index: number) => Record<string, unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i++) {
    const values = (mapRow ? mapRow(rows[i], i) : rows[i]) as Record<
      string,
      unknown
    >;
    await db
      .insert(table)
      .values(values as never)
      .onConflictDoUpdate({ target: pk, set: values as never });
  }
}

export function makeTableStore<TTable extends ScopedTable>(
  table: TTable,
  pk: SQLiteColumn,
  config: StoreConfig = {},
) {
  type Row = InferSelectModel<TTable>;

  return {
    async list(): Promise<Row[] | null> {
      const local = await getLocalDb();
      if (!local) return null;
      let query = local.db.select().from(table).$dynamic();
      const orderBy = config.defaultOrderBy;
      if (orderBy) {
        query = query.orderBy(orderBy);
      }
      return (await query) as Row[];
    },

    async get(id: StorePkValue): Promise<Row | null> {
      const local = await getLocalDb();
      if (!local) return null;
      const rows = await local.db
        .select()
        .from(table)
        .where(eq(pk, id))
        .limit(1);
      return (rows[0] as Row | undefined) ?? null;
    },

    async upsert(row: StoreRow): Promise<void> {
      const local = await getLocalDb();
      if (!local) return;
      await local.db
        .insert(table)
        .values(row as never)
        .onConflictDoUpdate({ target: pk, set: row as never });
    },

    async update(id: StorePkValue, patch: Partial<StoreRow>): Promise<void> {
      const local = await getLocalDb();
      if (!local) return;
      await local.db
        .update(table)
        .set(patch as never)
        .where(eq(pk, id));
    },

    async drop(id: StorePkValue): Promise<void> {
      const local = await getLocalDb();
      if (!local) return;
      await local.db.delete(table).where(eq(pk, id));
    },
  };
}
