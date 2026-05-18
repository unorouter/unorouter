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

export function makeTableStore<TTable extends ScopedTable>(
  table: TTable,
  pk: SQLiteColumn,
) {
  type Row = InferSelectModel<TTable>;
  // Loose input: server bundles arrive as opaque JSON. Factory absorbs the
  // cast at the Drizzle call boundary.
  type Insert = Record<string, unknown>;
  type PkValue = string | number;

  const scopeWhere = (userId: number, base: SQL): SQL => {
    if (!table.userId) return base;
    const combined = and(base, eq(table.userId, userId));
    return combined ?? base;
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
      if (opts?.orderBy) {
        query = query.orderBy(opts.orderBy);
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
      const values: Insert =
        scope && table.userId ? { ...row, userId } : row;
      // Drizzle's `.values()`/`.set()` types don't accept the equivalent
      // `InferInsertModel<TTable>` shape we pass in; cast locally.
      type DrizzleInsert = Parameters<
        ReturnType<typeof local.db.insert<TTable>>["values"]
      >[0];
      type DrizzleUpdateSet = Parameters<
        ReturnType<
          ReturnType<typeof local.db.insert<TTable>>["values"]
        >["onConflictDoUpdate"]
      >[0]["set"];
      await local.db
        .insert(table)
        .values(values as unknown as DrizzleInsert)
        .onConflictDoUpdate({
          target: pk,
          set: row as unknown as DrizzleUpdateSet,
        });
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

