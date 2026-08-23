"use client";

import type {
  ScopedTable,
  StoreConfig,
  StorePkValue,
  StoreRow,
} from "@/lib/types";
import type { InferInsertModel, InferSelectModel, SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { eq } from "drizzle-orm";
import { getLocalDb } from "../client";

// drizzle's values()/set() overloads only resolve against a CONCRETE table, so a
// generic TTable cannot reach them. This shim states what the runtime accepts;
// mapRow's return type is what keeps every call site checked against the table.
type ChildRowWriter<TTable extends ScopedTable> = {
  delete: (table: ScopedTable) => { where: (cond: SQL) => Promise<unknown> };
  insert: (table: ScopedTable) => {
    values: (row: InferInsertModel<TTable>) => Promise<unknown> & {
      onConflictDoUpdate: (opts: {
        target: SQLiteColumn | SQLiteColumn[];
        set: InferInsertModel<TTable>;
      }) => Promise<unknown>;
    };
  };
};

export async function replaceChildRows<TTable extends ScopedTable, T>(
  db: ChildRowWriter<TTable>,
  table: TTable,
  fkColumn: SQLiteColumn,
  parentId: string,
  rows: T[],
  mapRow: (row: T, index: number) => InferInsertModel<TTable>,
): Promise<void> {
  await db.delete(table).where(eq(fkColumn, parentId));
  for (let i = 0; i < rows.length; i++) {
    await db.insert(table).values(mapRow(rows[i], i));
  }
}

export async function mergeChildRows<TTable extends ScopedTable, T>(
  db: ChildRowWriter<TTable>,
  table: TTable,
  pk: SQLiteColumn | SQLiteColumn[],
  rows: T[],
  mapRow: (row: T, index: number) => InferInsertModel<TTable>,
): Promise<void> {
  for (let i = 0; i < rows.length; i++) {
    const values = mapRow(rows[i], i);
    await db
      .insert(table)
      .values(values)
      .onConflictDoUpdate({ target: pk, set: values });
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
      return await query;
    },

    async get(id: StorePkValue): Promise<Row | null> {
      const local = await getLocalDb();
      if (!local) return null;
      const rows = await local.db
        .select()
        .from(table)
        .where(eq(pk, id))
        .limit(1);
      return rows[0] ?? null;
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
