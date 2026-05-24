"use client";

import type {
  ScopedTable,
  StoreConfig,
  StoreListOpts,
  StorePkValue,
  StoreRow,
  StoreRowOpts,
} from "@/lib/types";
import { GUEST_USER_ID } from "@/lib/config/constants";
import type { InferSelectModel, SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { and, eq } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { getLocalDb } from "../client";

type LocalDb = {
  delete: (table: SQLiteTable) => { where: (cond: SQL) => Promise<unknown> };
  insert: (table: SQLiteTable) => {
    values: (row: never) => Promise<unknown>;
  };
};

// Replaces every child row whose FK column equals `parentId`: delete the old
// set, then insert each given row. `mapRow` reshapes inputs into full rows
// (e.g. stamping the parent id or an order index); omit it for raw rows.
// No transaction wrapper: SQLocal's transactionMutex deadlocks drizzle
// sqlite-proxy queries (see upsertLocalConversationBundle).
//
// Caller invariant: this WIPES local-only rows under `parentId`. Use only on
// import / authoritative-replace paths; sync-pull paths should call
// `mergeChildRows` instead.
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

// Per-row merge: upsert each row by its PK without deleting siblings.
// Local-only rows under `parentId` that aren't in the incoming list
// survive the merge, which is the correct semantic for sync-pull child
// arrays (settings, conv bindings, lorebook entries, media). Caller
// supplies the PK column so the conflict target is explicit.
//
// `LocalInsertable` is the wider drizzle insert builder; the narrow
// `LocalDb` shape in this file only exposes `values()` because that's
// all replaceChildRows needs.
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
    async list(userId?: number, opts?: StoreListOpts): Promise<Row[] | null> {
      const uid = userId ?? GUEST_USER_ID;
      const local = await getLocalDb(uid);
      if (!local) return null;
      const scope = opts?.scopeUser ?? true;
      let query = local.db.select().from(table).$dynamic();
      if (scope && table.userId) {
        query = query.where(eq(table.userId, uid));
      }
      const orderBy = opts?.orderBy ?? config.defaultOrderBy;
      if (orderBy) {
        query = query.orderBy(orderBy);
      }
      return (await query) as Row[];
    },

    async get(
      userId: number | undefined,
      id: StorePkValue,
      opts?: StoreRowOpts,
    ): Promise<Row | null> {
      const uid = userId ?? GUEST_USER_ID;
      const local = await getLocalDb(uid);
      if (!local) return null;
      const scope = opts?.scopeUser ?? true;
      const base = eq(pk, id);
      const where = scope ? scopeWhere(uid, base) : base;
      const rows = await local.db.select().from(table).where(where).limit(1);
      return (rows[0] as Row | undefined) ?? null;
    },

    async upsert(
      userId: number | undefined,
      row: StoreRow,
      opts?: StoreRowOpts,
    ): Promise<void> {
      const uid = userId ?? GUEST_USER_ID;
      const local = await getLocalDb(uid);
      if (!local) return;
      const scope = opts?.scopeUser ?? true;
      const values = scope && table.userId ? { ...row, userId: uid } : row;
      // Loose row type: callers and opaque sync bundles both flow through
      // here. Drizzle's per-table insert/set types reject the generic shape;
      // cast at this one boundary, accept the trade.
      await local.db
        .insert(table)
        .values(values as never)
        .onConflictDoUpdate({ target: pk, set: row as never });
    },

    async drop(
      userId: number | undefined,
      id: StorePkValue,
      opts?: StoreRowOpts,
    ): Promise<void> {
      const uid = userId ?? GUEST_USER_ID;
      const local = await getLocalDb(uid);
      if (!local) return;
      const scope = opts?.scopeUser ?? true;
      const base = eq(pk, id);
      const where = scope ? scopeWhere(uid, base) : base;
      await local.db.delete(table).where(where);
    },
  };
}
