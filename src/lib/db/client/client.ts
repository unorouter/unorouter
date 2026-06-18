"use client";

import { GUEST_USER_ID, IS_DEV } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import type { LocalClient } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { SQLocalDrizzle } from "sqlocal/drizzle";

// Per-user OPFS file (`appname-<userId>.sqlite3`), lazy WASM. One cached connection per user.

let cached = new Map<number, Promise<LocalClient>>();

export async function getLocalDb(
  userId: number | undefined = GUEST_USER_ID,
): Promise<LocalClient | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined")
    return null;
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

export function resetLocalDbCache() {
  cached = new Map();
}

// Recoverable = the SyncAccessHandle is held/lost (a prior tab still releasing on reload,
// cleared site data, destroyed-under-us). The file is fine; reopen and retry. Anything else
// rethrows so getLocalDb drops the cache and the next open retries: a hiccup never wipes data.
function isRecoverable(err: unknown): boolean {
  const s = String(err);
  return (
    s.includes("GetSyncHandleError") ||
    s.includes("InvalidStateError") ||
    s.includes("NotFoundError") ||
    s.includes("SQLITE_IOERR") ||
    s.includes("SQLITE_CANTOPEN") ||
    s.includes("SQLITE_BUSY") ||
    s.includes("client has been destroyed")
  );
}

const RETRIES = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newSql = (dbPath: string) =>
  new SQLocalDrizzle({ databasePath: dbPath, reactive: false, releaseOnUnload: true });

// Open + migrate, retrying transient handle contention with backoff. SQLocal silently serves an
// EMPTY in-memory DB when OPFS init fails (real file intact on disk) -> getDatabaseInfo is the
// only signal; treat the fallback as contention so a retry lands on the real file.
async function openMigratedSql(
  dbPath: string,
  userId: number,
): Promise<SQLocalDrizzle> {
  const { runMigrations } = await import("./schema-migrate/migrations");
  let sql = newSql(dbPath);
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await sql.getDatabaseInfo()).storageType !== "opfs") {
        throw new Error("GetSyncHandleError: fell back to in-memory");
      }
      await runMigrations(sql);
      return sql;
    } catch (err) {
      if (!isRecoverable(err) || attempt >= RETRIES) throw err;
      logger.warn("Local DB open contended; retrying", {
        context: "local-db.client",
        userId,
        attempt,
        error: String(err),
      });
      await sql.destroy().catch(() => {});
      await sleep(50 * 2 ** attempt);
      sql = newSql(dbPath);
    }
  }
}

async function openClient(userId: number): Promise<LocalClient> {
  const dbPath = `${env.appName.toLowerCase()}-${userId}.sqlite3`;
  let sql = await openMigratedSql(dbPath, userId);
  let reopening: Promise<void> | null = null;

  // Self-heal a handle lost mid-session: single-flight reopen, replay the failed call once
  // (it never ran on the dead handle, so replay is safe).
  const run = async <T>(fn: (s: SQLocalDrizzle) => Promise<T>): Promise<T> => {
    try {
      return await fn(sql);
    } catch (err) {
      if (!isRecoverable(err)) throw err;
      reopening ??= (async () => {
        await sql.destroy().catch(() => {});
        sql = await openMigratedSql(dbPath, userId);
      })().finally(() => (reopening = null));
      await reopening;
      return fn(sql);
    }
  };

  const db = drizzle(
    (q, params, method) => run((s) => s.driver(q, params, method)),
    (queries) => run((s) => s.batchDriver(queries)),
    { schema: { ...shared, ...client } },
  );
  const wrapped: LocalClient = {
    db,
    exec: (q, params, method) => run((s) => s.exec(q, params, method)),
    transaction: (cb) => run((s) => s.transaction(cb)),
    destroy: () => sql.destroy(),
    deleteDatabaseFile: () => sql.deleteDatabaseFile(),
    getDatabaseFile: () => sql.getDatabaseFile(),
    overwriteDatabaseFile: (file) => sql.overwriteDatabaseFile(file),
    reactiveQuery: (query) => sql.reactiveQuery(query),
  };

  if (IS_DEV && typeof window !== "undefined") {
    window.__local = wrapped;
    window.__shared = shared;
    window.__sqlocal = sql;
  }
  return wrapped;
}
