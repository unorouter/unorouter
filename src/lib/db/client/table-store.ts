"use client";

import type { InferSelectModel, SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { and, eq } from "drizzle-orm";
import { getLocalDb } from "./client";

// `scopeUser` (default true) ANDs `eq(table.userId, userId)` into per-row
// WHERE clauses AND merges `userId` into upsert rows. Tables without a userId
// column (conversationSettings, messages, etc.) must pass scopeUser: false.

type ScopedTable = SQLiteTable & { userId?: SQLiteColumn };

type ListOpts = { orderBy?: SQL | SQLiteColumn; scopeUser?: boolean };
type RowOpts = { scopeUser?: boolean };

type StoreConfig = { defaultOrderBy?: SQL | SQLiteColumn };

export function makeTableStore<TTable extends ScopedTable>(
  table: TTable,
  pk: SQLiteColumn,
  config: StoreConfig = {},
) {
  type Row = InferSelectModel<TTable>;
  // Loose input: server bundles arrive as opaque JSON. Factory absorbs the
  // cast at the Drizzle call boundary.
  type Insert = Record<string, unknown>;
  type PkValue = string | number;

  const scopeWhere = (userId: number, base: SQL): SQL => {
    if (!table.userId) return base;
    return and(base, eq(table.userId, userId)) as SQL;
  };

  return {
    async list(userId: number, opts?: ListOpts): Promise<Row[] | null> {
      const local = await getLocalDb(userId);
      if (!local) return null;
      const scope = opts?.scopeUser ?? true;
      let query = local.db.select().from(table).$dynamic();
      if (scope && table.userId) {
        query = query.where(eq(table.userId, userId));
      }
      const orderBy = opts?.orderBy ?? config.defaultOrderBy;
      if (orderBy) {
        query = query.orderBy(orderBy);
      }
      const rows = await query;
      return rows as Row[];
    },

    async get(
      userId: number,
      id: PkValue,
      opts?: RowOpts,
    ): Promise<Row | null> {
      const local = await getLocalDb(userId);
      if (!local) return null;
      const scope = opts?.scopeUser ?? true;
      const base = eq(pk, id);
      const where = scope ? scopeWhere(userId, base) : base;
      const rows = await local.db.select().from(table).where(where).limit(1);
      return (rows[0] as Row | undefined) ?? null;
    },

    async upsert(
      userId: number,
      row: Insert,
      opts?: RowOpts,
    ): Promise<void> {
      const local = await getLocalDb(userId);
      if (!local) return;
      const scope = opts?.scopeUser ?? true;
      const values = scope && table.userId ? { ...row, userId } : row;
      // Generic factory is intentionally loose on row shape (server bundles
      // arrive opaque). Drizzle insert/set types want per-table columns.
      await local.db
        .insert(table)
        .values(values as never)
        .onConflictDoUpdate({ target: pk, set: row as never });
    },

    async drop(
      userId: number,
      id: PkValue,
      opts?: RowOpts,
    ): Promise<void> {
      const local = await getLocalDb(userId);
      if (!local) return;
      const scope = opts?.scopeUser ?? true;
      const base = eq(pk, id);
      const where = scope ? scopeWhere(userId, base) : base;
      await local.db.delete(table).where(where);
    },
  };
}

