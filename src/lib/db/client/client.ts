"use client";

import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";

// Per-user OPFS file so multi-account browsers stay isolated. Lazy-imports
// `sqlocal/drizzle` so the WASM blob (~1.5MB) only loads in chat/playground
// route groups.

type LocalSchema = typeof shared & typeof client;
export type LocalDb = SqliteRemoteDatabase<LocalSchema>;
// Returns rows + column names, unlike the drizzle-proxy driver which only
// returns row tuples. Used by LocalDbStudio for arbitrary user-supplied SQL.
export type LocalRawExec = (
  sql: string,
  params: unknown[],
  method?: "all" | "run" | "get" | "values",
) => Promise<{
  rows: unknown[][];
  columns: string[];
  numAffectedRows?: number;
}>;

export type LocalClient = {
  db: LocalDb;
  exec: LocalRawExec;
  transaction: <T>(cb: () => Promise<T>) => Promise<T>;
  destroy: () => Promise<void>;
  deleteDatabaseFile: () => Promise<void>;
  getDatabaseFile: () => Promise<File>;
  overwriteDatabaseFile: (file: File | Blob) => Promise<void>;
  // Loosely-typed: SQLocal's generic surface is awkward to thread through.
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
  const { SQLocalDrizzle } = await import("sqlocal/drizzle");
  const sql = new SQLocalDrizzle({
    databasePath: `unorouter-${userId}.sqlite3`,
    reactive: false,
  });
  const { driver, batchDriver } = sql;
  const db = drizzle(driver, batchDriver, {
    schema: { ...shared, ...client },
  });

  const { runMigrations } = await import("./migrations");
  await runMigrations(sql);

  // SQLocal's protected `exec` (documented in sqlocal/dist/client.d.ts) is
  // off the public API but needed for raw queries (LocalDbStudio).
  const rawExec = (sql as unknown as { exec: LocalRawExec }).exec.bind(sql);

  const wrapped: LocalClient = {
    db,
    exec: rawExec,
    transaction: <T>(cb: () => Promise<T>) => sql.transaction(cb),
    destroy: () => sql.destroy(),
    deleteDatabaseFile: () => sql.deleteDatabaseFile(),
    getDatabaseFile: () => sql.getDatabaseFile(),
    overwriteDatabaseFile: (file) => sql.overwriteDatabaseFile(file),
    reactiveQuery: sql.reactiveQuery.bind(sql) as LocalClient["reactiveQuery"],
  };
  // Release SyncAccessHandle on page unload, else SAH stays locked and
  // Chromium/Brave attributes OPFS bytes to "orphan" state until storage is
  // evicted. `beforeunload` covers browsers that don't dispatch pagehide.
  if (typeof window !== "undefined") {
    const release = () => {
      void sql.destroy().catch(() => {});
    };
    window.addEventListener("pagehide", release, { once: true });
    window.addEventListener("beforeunload", release, { once: true });
    (window as unknown as { __local: unknown }).__local = wrapped;
    (window as unknown as { __shared: unknown }).__shared = shared;
    (window as unknown as { __sqlocal: unknown }).__sqlocal = sql;
  }
  return wrapped;
}

export function resetLocalDbCache() {
  cached = new Map();
}
