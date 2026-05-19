"use client";

import type {
  ScopedTable,
  StoreConfig,
  StoreListOpts,
  StorePkValue,
  StoreRow,
  StoreRowOpts,
} from "@/lib/types";
import type { InferSelectModel, SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { and, eq } from "drizzle-orm";
import { getLocalDb } from "../client";

// `scopeUser` (default true) ANDs `eq(table.userId, userId)` into per-row
// WHERE clauses AND merges `userId` into upsert rows. Tables without a userId
// column (conversationSettings, messages, etc.) must pass scopeUser: false.

export function makeTableStore<TTable extends ScopedTable>(
  table: TTable,
  pk: SQLiteColumn,
  config: StoreConfig = {},
) {
  type Row = InferSelectModel<TTable>;

  const scopeWhere = (userId: number, base: SQL): SQL => {
    if (!table.userId) return base;
    // and(...) with 2 defined SQL args never returns undefined.
    return and(base, eq(table.userId, userId))!;
  };

  return {
    async list(userId: number, opts?: StoreListOpts): Promise<Row[] | null> {
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
      return (await query) as Row[];
    },

    async get(
      userId: number,
      id: StorePkValue,
      opts?: StoreRowOpts,
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
      row: StoreRow,
      opts?: StoreRowOpts,
    ): Promise<void> {
      const local = await getLocalDb(userId);
      if (!local) return;
      const scope = opts?.scopeUser ?? true;
      const values = scope && table.userId ? { ...row, userId } : row;
      // Loose row type: server bundles arrive as opaque Record<string, unknown>.
      // Drizzle's per-table insert/set types reject the generic shape; cast at
      // the boundary, accept the trade.
      await local.db
        .insert(table)
        .values(values as never)
        .onConflictDoUpdate({ target: pk, set: row as never });
    },

    async drop(
      userId: number,
      id: StorePkValue,
      opts?: StoreRowOpts,
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
