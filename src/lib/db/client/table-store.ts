"use client";

import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { and, eq, type SQL } from "drizzle-orm";
import { getLocalDb } from "./client";

// ---------------------------------------------------------------------------
// Generic CRUD factory for single-PK SQLocal tables. Removes the copy-paste
// upsert / read / delete pattern that dominates writes.ts and reads.ts. Each
// method handles the `getLocalDb` null check (SSR / no-OPFS paths) so callers
// stay one line.
//
// `scopeUser` (default true) ANDs `eq(table.userId, userId)` into per-row
// WHERE clauses for ownership safety AND merges `userId` into upsert rows.
// Tables without a userId column (conversationSettings, messages, etc.)
// must pass scopeUser: false at the call site that needs row-scoping.
// ---------------------------------------------------------------------------

type AnyTable = SQLiteTable & { userId?: SQLiteColumn };

type ListOpts = { orderBy?: SQL | SQLiteColumn; scopeUser?: boolean };
type RowOpts = { scopeUser?: boolean };

export type TableStore<TRow> = {
  list: (userId: number, opts?: ListOpts) => Promise<TRow[] | null>;
  get: (
    userId: number,
    id: string | number,
    opts?: RowOpts,
  ) => Promise<TRow | null>;
  upsert: (
    userId: number,
    row: Record<string, unknown>,
    opts?: RowOpts,
  ) => Promise<void>;
  drop: (
    userId: number,
    id: string | number,
    opts?: RowOpts,
  ) => Promise<void>;
};

export function makeTableStore<TRow>(
  table: AnyTable,
  pk: SQLiteColumn,
): TableStore<TRow> {
  const scopeWhere = (userId: number, base: SQL) => {
    if (table.userId) return and(base, eq(table.userId, userId))!;
    return base;
  };

  return {
    async list(userId, opts) {
      const local = await getLocalDb(userId);
      if (!local) return null;
      const scope = opts?.scopeUser ?? true;
      let q = local.db.select().from(table).$dynamic();
      if (scope && table.userId) q = q.where(eq(table.userId, userId));
      if (opts?.orderBy) q = q.orderBy(opts.orderBy as never);
      return (await q) as TRow[];
    },

    async get(userId, id, opts) {
      const local = await getLocalDb(userId);
      if (!local) return null;
      const scope = opts?.scopeUser ?? true;
      const base = eq(pk, id);
      const where = scope ? scopeWhere(userId, base) : base;
      const rows = (await local.db
        .select()
        .from(table)
        .where(where)
        .limit(1)) as TRow[];
      return rows[0] ?? null;
    },

    async upsert(userId, row, opts) {
      const local = await getLocalDb(userId);
      if (!local) return;
      const scope = opts?.scopeUser ?? true;
      const values = scope && table.userId ? { ...row, userId } : row;
      await local.db
        .insert(table)
        .values(values as never)
        .onConflictDoUpdate({ target: pk, set: row as never });
    },

    async drop(userId, id, opts) {
      const local = await getLocalDb(userId);
      if (!local) return;
      const scope = opts?.scopeUser ?? true;
      const base = eq(pk, id);
      const where = scope ? scopeWhere(userId, base) : base;
      await local.db.delete(table).where(where);
    },
  };
}
