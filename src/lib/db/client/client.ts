"use client";

import { IS_DEV } from "@/lib/config/constants";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import { logger } from "@/lib/utils/logger";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";

// Per-user OPFS file isolates multi-account browsers. Lazy `sqlocal/drizzle`
// import keeps the ~1.5MB WASM out of non-chat/playground chunks.

type LocalSchema = typeof shared & typeof client;
export type LocalDb = SqliteRemoteDatabase<LocalSchema>;
// Returns rows + column names (drizzle-proxy returns tuples only). Used by
// LocalDbStudio for arbitrary user-supplied SQL.
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
  const dbPath = `unorouter-${userId}.sqlite3`;
  let sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });

  const { runMigrations } = await import("./migrations");
  try {
    await runMigrations(sql);
  } catch (err) {
    // Dev: schema reset after `bun db:reset` leaves stale OPFS tables that
    // collide on fresh migration tags. Wipe + reopen. Production never wipes
    // (user data is precious; export instead).
    if (!IS_DEV) throw err;
    logger.warn("Local DB migration failed in dev; wiping OPFS file", {
      context: "local-db.client",
      userId,
      error: String(err),
    });
    await sql.deleteDatabaseFile().catch(() => {});
    await sql.destroy().catch(() => {});
    sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });
    await runMigrations(sql);
  }

  const { driver, batchDriver } = sql;
  const db = drizzle(driver, batchDriver, {
    schema: { ...shared, ...client },
  });

  // SQLocal's protected `exec` (sqlocal/dist/client.d.ts) is off the public
  // API but needed for raw queries (LocalDbStudio).
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
  // Release SAH on unload, else Chromium/Brave keeps OPFS bytes in "orphan"
  // state until eviction. `beforeunload` covers browsers without pagehide.
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
