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

const ORPHAN_MARKER = "OpfsSAHPool orphan";
export const TAB_LOCK_MARKER = "OpfsSAHPool tab-locked";

function isRecoverable(err: unknown): boolean {
  const s = String(err);
  // An orphaned pool file is NOT contention: retrying just re-opens the same
  // empty replacement and would report success, hiding the user's data.
  if (s.includes(ORPHAN_MARKER)) return false;
  // Another tab holds the pool. Retrying cannot help (the lock is held for that
  // tab's lifetime) and every attempt is another chance to tear a header.
  if (s.includes(TAB_LOCK_MARKER)) return false;
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
      await assertNotSilentlyEmptied(sql, dbPath, userId);
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

// opfs-sahpool verifies a digest in each pool file's 4096-byte header on every
// install and, when it fails, SILENTLY drops that file's logical name and frees
// the slot. The data is untouched but unreferenced, so the next open creates a
// brand-new empty database under the same name and the user sees a wiped app. A
// torn header is what an abrupt process kill produces (iOS Safari discards
// background tabs mid-write), which is exactly how one user lost a long RP.
//
// Refuse to hand back a database that is empty while the pool still holds a
// LARGER sqlite file than the one we just opened: that combination means the
// real database is sitting there orphaned. Throwing here is non-recoverable on
// purpose - the retry loop must not paper over it, and the user gets the
// DB-unavailable state with their bytes intact for the Studio's recover action.
async function assertNotSilentlyEmptied(
  sql: SQLocalDrizzle,
  dbPath: string,
  userId: number,
): Promise<void> {
  const info = await sql.getDatabaseInfo();
  const liveBytes = info.databaseSizeBytes ?? 0;
  // Only a just-created database is worth checking; anything with real content
  // is by definition not the empty-replacement case.
  const rows = await sql.sql<{ n: number }>(
    "SELECT (SELECT COUNT(*) FROM conversations) + (SELECT COUNT(*) FROM characters) + (SELECT COUNT(*) FROM lorebooks) + (SELECT COUNT(*) FROM sampling_presets) AS n",
  );
  if (Number(rows[0]?.n ?? 0) > 0) return;

  let orphanBytes = 0;
  try {
    const { salvagePoolDatabases } =
      await import("@/lib/db/client/sahpool/salvage");
    for (const candidate of await salvagePoolDatabases(dbPath)) {
      // POOL files only. A root `.pre-sahpool` copy is the NORMAL leftover of a
      // successful migration and is routinely larger than a fresh empty db, so
      // counting it would lock out every user who migrated cleanly.
      if (candidate.source !== "pool") continue;
      // The live db is itself one of the pool files; only a STRICTLY larger one
      // is evidence of an orphan holding the user's data.
      if (candidate.sizeBytes > liveBytes) {
        orphanBytes = Math.max(orphanBytes, candidate.sizeBytes);
      }
    }
  } catch {
    // Can't inspect the pool (permissions, layout change): fall through rather
    // than block a legitimately empty first-run database.
    return;
  }
  if (orphanBytes === 0) return;

  logChatDebug("db.open.orphan_detected", { userId, liveBytes, orphanBytes });
  logger.error("Local DB opened empty while the pool holds a larger database", {
    context: "local-db.client",
    userId,
    liveBytes,
    orphanBytes,
  });
  throw new Error(
    `${ORPHAN_MARKER}: opened an empty database while ${orphanBytes} bytes sit unreferenced in the pool`,
  );
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
  // Keep a rollback copy. Safari has no main-thread FileSystemFileHandle.move(),
  // and the old fallback deleted the legacy file outright - so every Safari user
  // (i.e. every iPhone) lost their only pre-migration copy. Copy the bytes to
  // `.pre-sahpool` via createWritable (which Safari does support) before
  // removing the original, and keep the original if that copy fails.
  try {
    const movable = handle as FileSystemFileHandle & {
      move?: (name: string) => Promise<void>;
    };
    if (typeof movable.move === "function") {
      await movable.move(`${dbPath}.pre-sahpool`);
    } else {
      const backup = await root.getFileHandle(`${dbPath}.pre-sahpool`, {
        create: true,
      });
      const writable = await backup.createWritable();
      await file.stream().pipeTo(writable);
      await root.removeEntry(dbPath);
    }
  } catch (err) {
    logChatDebug("db.migrate.sahpool.backup_failed", {
      userId,
      error: String(err).slice(0, 200),
    });
    // The copy failed, so there is no rollback. The legacy file must still go:
    // leaving it means the NEXT open re-imports it wholesale and discards
    // everything written since this migration. The import above already
    // succeeded and passed integrity_check, so the data is in the pool.
    await root.removeEntry(dbPath).catch(() => {});
  }
  logChatDebug("db.migrate.sahpool.done", { userId, bytes: file.size });
}

async function openClient(userId: number): Promise<LocalClient> {
  const appName = env.appName.toLowerCase();
  const dbPath = `${appName}-${userId}.sqlite3`;
  // ONE tab may touch the pool. opfs-sahpool claims exclusive sync access
  // handles for every pool file, so a second tab's install attempt fails by
  // design - but a failed attempt can leave a pool file's header torn, after
  // which the FIRST tab opens an empty database and the user sees a wipe. That
  // is how a user lost a long RP: chat in one tab, /image in another, both
  // resolving to this same per-user pool.
  //
  // Take the lock BEFORE any pool access and never release it while the tab
  // lives (the browser releases it when the tab dies). A second tab fails fast
  // with a non-recoverable error instead of racing for the handles.
  const { acquireLock } = await import("@/lib/db/client/outbox/resource-lock");
  if (!(await acquireLock(`db:${dbPath}`))) {
    logChatDebug("db.open.tab_locked", { userId });
    throw new Error(
      `${TAB_LOCK_MARKER}: ${dbPath} is open in another tab or window`,
    );
  }
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
