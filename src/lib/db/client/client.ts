"use client";

import { GUEST_USER_ID, IS_DEV } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import { runMigrations } from "@/lib/db/client/schema-migrate/migrations";
import type { LocalClient } from "@/lib/types";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
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

// Recoverable = the SyncAccessHandle is held/lost; the file is fine, reopen and retry. Else rethrow.
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

// A prior tab's SAH can take >1s to release (worse on iOS); 7 capped-backoff tries (~4.5s) ride it out.
const RETRIES = 7;
const MAX_BACKOFF = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newSql = (dbPath: string) =>
  new SQLocalDrizzle({
    databasePath: dbPath,
    reactive: false,
    releaseOnUnload: true,
  });

// SQLocal silently serves an empty in-memory DB when OPFS init fails; getDatabaseInfo is the only
// signal, so treat the in-memory fallback as contention and retry onto the real file.
async function openMigratedSql(
  dbPath: string,
  userId: number,
): Promise<SQLocalDrizzle> {
  // runMigrations is STATIC-imported (it + its 20K manifest fold into this client chunk). It was lazily
  // imported before, which spun a separate chunk that ChunkLoadError'd on the DB-open path whenever the tab
  // held a stale chunk URL (every dev rebuild; a network blip in prod) - the pending-drain hit it repeatedly.
  // OPFS needs SharedArrayBuffer, i.e. a cross-origin-isolated document. Non-isolated pages
  // (marketing routes that don't get COOP/COEP) can never persist; accept the in-memory DB
  // once instead of retrying 7x into a guaranteed failure (theme/etc still ride the cookie atom).
  const isolated =
    typeof window === "undefined" || window.crossOriginIsolated !== false;
  let sql = newSql(dbPath);
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await sql.getDatabaseInfo()).storageType !== "opfs") {
        if (!isolated) {
          logChatDebug("db.open.fallback", { userId, reason: "non-isolated" });
          await runMigrations(sql);
          return sql;
        }
        throw new Error("GetSyncHandleError: fell back to in-memory");
      }
      await runMigrations(sql);
      logChatDebug("db.open.done", { userId, storageType: "opfs" });
      return sql;
    } catch (err) {
      if (!isRecoverable(err) || attempt >= RETRIES) {
        logChatDebug("db.open.failed", {
          userId,
          attempt,
          error: String(err).slice(0, 200),
        });
        throw err;
      }
      logChatDebug("db.open.retry", {
        userId,
        attempt,
        error: String(err).slice(0, 200),
      });
      logger.warn("Local DB open contended; retrying", {
        context: "local-db.client",
        userId,
        attempt,
        error: String(err),
      });
      await sql.destroy().catch(() => {});
      await sleep(Math.min(50 * 2 ** attempt, MAX_BACKOFF));
      sql = newSql(dbPath);
    }
  }
}

async function openClient(userId: number): Promise<LocalClient> {
  const dbPath = `${env.appName.toLowerCase()}-${userId}.sqlite3`;
  let sql = await openMigratedSql(dbPath, userId);
  let reopening: Promise<void> | null = null;

  // Handle lost mid-session: single-flight reopen, replay the failed call once (it never ran).
  const run = async <T>(fn: (s: SQLocalDrizzle) => Promise<T>): Promise<T> => {
    try {
      return await fn(sql);
    } catch (err) {
      if (!isRecoverable(err)) throw err;
      reopening ??= (async () => {
        logChatDebug("db.reopen", { userId, error: String(err).slice(0, 200) });
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
    getDatabaseInfo: () => sql.getDatabaseInfo(),
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
