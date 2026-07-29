"use client";
import { sleep } from "@/lib/utils/base";

import { GUEST_USER_ID } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import { newSql } from "@/lib/db/client/new-sql";
import { runMigrations } from "@/lib/db/client/schema-migrate/migrations";
import type { LocalClient } from "@/lib/types";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { logger } from "@/lib/utils/logger";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { SQLocalDrizzle } from "sqlocal/drizzle";

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

function isRecoverable(err: unknown): boolean {
  const s = String(err);
  return (
    s.includes("GetSyncHandleError") ||
    s.includes("InvalidStateError") ||
    s.includes("NotFoundError") ||
    s.includes("SQLITE_IOERR") ||
    s.includes("SQLITE_CANTOPEN") ||
    s.includes("SQLITE_BUSY") ||
    s.includes("SQLITE_CORRUPT") ||
    s.includes("SQLITE_NOTADB") ||
    s.includes("file is not a database") ||
    s.includes("client has been destroyed") ||
    // opfs-sahpool contention/exhaustion shapes: another tab's pool holds the
    // sync access handles, or the pool ran out of file slots.
    s.includes("NoModificationAllowedError") ||
    s.includes("NotAllowedError") ||
    s.includes("OpfsSAHPool") ||
    s.includes("available file slots")
  );
}

const RETRIES = 7;
const MAX_BACKOFF = 1500;

async function openMigratedSql(
  dbPath: string,
  userId: number,
): Promise<SQLocalDrizzle> {
  let sql = newSql(dbPath);
  for (let attempt = 0; ; attempt++) {
    try {
      // The sahpool worker falls back to an in-memory driver when the pool
      // install fails (typically: another live tab holds the pool's access
      // handles). Never accept it - synthesize a recoverable error so the
      // retry loop absorbs the handover, exactly like SAH contention before.
      if ((await sql.getDatabaseInfo()).storageType !== "opfs") {
        throw new Error("OpfsSAHPool unavailable: fell back to in-memory");
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

// One-time migration off the pre-sahpool driver: the old opfs VFS stored the
// database as a plain sqlite file at the OPFS root; sahpool keeps opaque
// pool-managed files. While a legacy root file exists, stream-import it into
// the pool (overwrite is wholesale, so a half-imported pool from a previous
// failed attempt is fully healed by the retry), verify, re-run migrations on
// the imported (older-schema) data, and only then move the legacy file aside.
// Rename to .pre-sahpool keeps a rollback copy; Safari has no main-thread
// rename, so it falls back to deletion. If neither works the open ABORTS -
// silently continuing would let a later open re-import the stale legacy file
// over post-migration writes.
async function migrateLegacySqliteFile(
  sql: SQLocalDrizzle,
  dbPath: string,
  userId: number,
): Promise<void> {
  const root = await navigator.storage.getDirectory();
  let handle: FileSystemFileHandle;
  try {
    handle = await root.getFileHandle(dbPath);
  } catch {
    return;
  }
  const file = await handle.getFile();
  if (file.size === 0) {
    await root.removeEntry(dbPath).catch(() => {});
    return;
  }
  logChatDebug("db.migrate.sahpool.start", { userId, bytes: file.size });
  await sql.overwriteDatabaseFile(file.stream());
  const check = await sql.sql<{ integrity_check: string }>(
    "PRAGMA integrity_check",
  );
  if (check[0]?.integrity_check !== "ok") {
    throw new Error(
      `legacy import failed integrity_check: ${String(check[0]?.integrity_check).slice(0, 100)}`,
    );
  }
  await runMigrations(sql);
  try {
    const movable = handle as FileSystemFileHandle & {
      move?: (name: string) => Promise<void>;
    };
    if (typeof movable.move === "function") {
      await movable.move(`${dbPath}.pre-sahpool`);
    } else {
      await root.removeEntry(dbPath);
    }
  } catch {
    await root.removeEntry(dbPath);
  }
  logChatDebug("db.migrate.sahpool.done", { userId, bytes: file.size });
}

async function openClient(userId: number): Promise<LocalClient> {
  const appName = env.appName.toLowerCase();
  const dbPath = `${appName}-${userId}.sqlite3`;
  try {
    const { recoverPendingImport } =
      await import("@/lib/db/client/data-migrate/reconcile-import");
    await recoverPendingImport(dbPath, appName, userId);
  } catch (err) {
    logChatDebug("db.open.recover_error", {
      userId,
      error: String(err).slice(0, 200),
    });
  }
  let sql = await openMigratedSql(dbPath, userId);
  try {
    await migrateLegacySqliteFile(sql, dbPath, userId);
  } catch (err) {
    logChatDebug("db.migrate.sahpool.failed", {
      userId,
      error: String(err).slice(0, 200),
    });
    await sql.destroy().catch(() => {});
    throw err;
  }
  let reopening: Promise<void> | null = null;

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

  if (typeof window !== "undefined") {
    window.__local = wrapped;
    window.__shared = shared;
    window.__sqlocal = sql;
  }
  return wrapped;
}
