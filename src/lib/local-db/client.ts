"use client";

import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";

// ---------------------------------------------------------------------------
// Browser-only SQLocal + Drizzle singleton. Per-user OPFS file (one DB per
// account) so multi-account browsers stay isolated. Lazy-imports `sqlocal/
// drizzle` so the WASM blob (~1.5MB) only loads in the chat/generate
// route groups, never on marketing pages.
// ---------------------------------------------------------------------------

type LocalSchema = typeof shared & typeof client;
export type LocalDb = SqliteRemoteDatabase<LocalSchema>;
export type LocalClient = {
  db: LocalDb;
  transaction: <T>(cb: () => Promise<T>) => Promise<T>;
  destroy: () => Promise<void>;
  deleteDatabaseFile: () => Promise<void>;
  // `reactiveQuery` from sqlocal/drizzle. Exposed loosely-typed because
  // SQLocal's generic surface is awkward to thread through.
  reactiveQuery: (query: unknown) => {
    subscribe: (
      onData: (data: unknown) => void,
      onError?: (err: unknown) => void,
    ) => { unsubscribe: () => void };
  };
};

let cached = new Map<number, Promise<LocalClient>>();

export async function getLocalDb(userId: number): Promise<LocalClient | null> {
  if (typeof window === "undefined") return null;
  if (typeof indexedDB === "undefined") return null;
  const existing = cached.get(userId);
  if (existing) return existing;

  const promise = openClient(userId);
  cached.set(userId, promise);
  try {
    return await promise;
  } catch (err) {
    cached.delete(userId);
    throw err;
  }
}

async function openClient(userId: number): Promise<LocalClient> {
  // Lazy-load SQLocal so non-chat pages never pay the WASM cost.
  const { SQLocalDrizzle } = await import("sqlocal/drizzle");
  const sql = new SQLocalDrizzle({
    databasePath: `unorouter-${userId}.sqlite3`,
    reactive: false,
  });
  const { driver, batchDriver } = sql;
  const db = drizzle(driver, batchDriver, {
    schema: { ...shared, ...client },
  });

  // Replay any migrations that are newer than the version recorded in
  // local_meta. migrations.json is generated at build time from drizzle/
  // client/*.sql by scripts/bundle-migrations.ts.
  const { runMigrations } = await import("./migrations");
  await runMigrations(sql);

  const wrapped: LocalClient = {
    db,
    transaction: <T>(cb: () => Promise<T>) => sql.transaction(cb),
    destroy: () => sql.destroy(),
    deleteDatabaseFile: () => sql.deleteDatabaseFile(),
    reactiveQuery: sql.reactiveQuery.bind(sql) as LocalClient["reactiveQuery"],
  };
  // dev-only debug hook
  if (typeof window !== "undefined") {
    (window as unknown as { __local: unknown }).__local = wrapped;
    (window as unknown as { __shared: unknown }).__shared = shared;
    (window as unknown as { __sqlocal: unknown }).__sqlocal = sql;
  }
  return wrapped;
}

export function resetLocalDbCache() {
  cached = new Map();
}
