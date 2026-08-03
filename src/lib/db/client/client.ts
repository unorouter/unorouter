"use client";
import { sleep } from "@/lib/utils/base";

import { GUEST_USER_ID } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import { newSql, pauseSql, resumeSql } from "@/lib/db/client/new-sql";
import {
  requestOwnership,
  subscribeWant,
} from "@/lib/db/client/sahpool/db-ownership";
import {
  acquireLock,
  acquireLockWaiting,
  releaseLock,
} from "@/lib/db/client/outbox/resource-lock";
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

async function awaitOwnership(
  dbPath: string,
  lockKey: string,
): Promise<boolean> {
  const deadline = Date.now() + HANDOVER_TIMEOUT;
  while (Date.now() < deadline) {
    requestOwnership(dbPath);
    const slice = Math.min(WANT_RETRY_MS, deadline - Date.now());
    if (await acquireLockWaiting(lockKey, slice)) return true;
  }
  return false;
}

// Handover wait cap: covers a frozen owner tab (a dead one releases its Web
// Lock automatically and the wait resolves early).
const HANDOVER_TIMEOUT = 15_000;
// `want` is re-broadcast on this interval while waiting: a single shot is
// lost when the owner has not finished its own open yet (BroadcastChannel
// does not queue for handlers registered later).
const WANT_RETRY_MS = 2_000;
// A tab that just took the pool keeps it at least this long before honouring
// the next want, so two active tabs trade in batches instead of ping-ponging
// on every statement.
const MIN_HOLD_MS = 2_000;

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
  // ONE tab may hold the pool at a time. opfs-sahpool claims exclusive sync
  // access handles for every pool file, so a second tab's install attempt
  // fails by design - but a failed attempt can leave a pool file's header
  // torn, after which the FIRST tab opens an empty database and the user sees
  // a wipe. That is how a user lost a long RP: chat in one tab, /image in
  // another, both resolving to this same per-user pool.
  //
  // Take the Web Lock BEFORE any pool access. On contention, ask the owner to
  // hand the pool over (it drains, pauses its VFS, releases) and wait in the
  // lock queue; only a hung owner ends in the DB-unavailable state.
  const lockKey = `db:${dbPath}`;
  if (!(await acquireLock(lockKey))) {
    logChatDebug("db.open.handover_wait", { userId });
    if (!(await awaitOwnership(dbPath, lockKey))) {
      logChatDebug("db.open.tab_locked", { userId });
      throw new Error(
        `${TAB_LOCK_MARKER}: ${dbPath} is open in another tab or window`,
      );
    }
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
  // Reclaim the pre-cap request-log payloads once per open. Fire-and-forget:
  // it is pure cleanup and must never delay or fail the open.
  void import("@/lib/db/client/data/chat/request-log")
    .then((m) => m.trimRequestLogPayloads(userId))
    .then((n) => {
      if (n > 0) logChatDebug("db.reqlog.trimmed", { userId, rows: n });
    })
    .catch(() => {});

  let reopening: Promise<void> | null = null;

  // Cooperative handover state. `parked` means this tab gave the pool away:
  // the VFS is paused, the Web Lock released, and every statement path below
  // must reacquire before touching the database. Transitions are single-flight
  // through `transition` so park and unpark never interleave.
  let parked = false;
  let transition: Promise<void> | null = null;
  let lastAcquiredAt = Date.now();
  let inFlight = 0;
  let idleWaiters: (() => void)[] = [];

  const waitForIdle = () =>
    inFlight === 0
      ? Promise.resolve()
      : new Promise<void>((resolve) => idleWaiters.push(resolve));

  const parkNow = async () => {
    const heldFor = Date.now() - lastAcquiredAt;
    if (heldFor < MIN_HOLD_MS) await sleep(MIN_HOLD_MS - heldFor);
    await waitForIdle();
    await pauseSql(sql);
    parked = true;
    releaseLock(lockKey);
    logChatDebug("db.handover.parked", { userId });
  };

  const unparkNow = async () => {
    if (!(await awaitOwnership(dbPath, lockKey))) {
      throw new Error(`${TAB_LOCK_MARKER}: handover of ${dbPath} timed out`);
    }
    await resumeSql(sql);
    parked = false;
    lastAcquiredAt = Date.now();
    logChatDebug("db.handover.resumed", { userId });
  };

  const ensureOwned = async (): Promise<void> => {
    while (transition) await transition.catch(() => {});
    if (!parked) return;
    transition = unparkNow().finally(() => (transition = null));
    await transition;
  };

  const unsubscribeWant = subscribeWant(dbPath, () => {
    if (parked || transition) return;
    transition = parkNow().finally(() => (transition = null));
  });

  const gated = async <T>(
    fn: (s: SQLocalDrizzle) => Promise<T>,
  ): Promise<T> => {
    await ensureOwned();
    inFlight++;
    try {
      return await fn(sql);
    } finally {
      inFlight--;
      if (inFlight === 0) {
        idleWaiters.forEach((resolve) => resolve());
        idleWaiters = [];
      }
    }
  };

  const run = <T>(fn: (s: SQLocalDrizzle) => Promise<T>): Promise<T> =>
    gated(async () => {
      try {
        return await fn(sql);
      } catch (err) {
        if (!isRecoverable(err)) throw err;
        reopening ??= (async () => {
          logChatDebug("db.reopen", {
            userId,
            error: String(err).slice(0, 200),
          });
          await sql.destroy().catch(() => {});
          sql = await openMigratedSql(dbPath, userId);
        })().finally(() => (reopening = null));
        await reopening;
        return fn(sql);
      }
    });

  const db = drizzle(
    (q, params, method) => run((s) => s.driver(q, params, method)),
    (queries) => run((s) => s.batchDriver(queries)),
    { schema: { ...shared, ...client } },
  );
  const wrapped: LocalClient = {
    db,
    exec: (q, params, method) => run((s) => s.exec(q, params, method)),
    transaction: (cb) => run((s) => s.transaction(cb)),
    destroy: async () => {
      unsubscribeWant();
      await ensureOwned().catch(() => {});
      await sql.destroy();
      releaseLock(lockKey);
    },
    deleteDatabaseFile: () => gated((s) => s.deleteDatabaseFile()),
    getDatabaseFile: () => gated((s) => s.getDatabaseFile()),
    getDatabaseInfo: () => gated((s) => s.getDatabaseInfo()),
    overwriteDatabaseFile: (file) =>
      gated((s) => s.overwriteDatabaseFile(file)),
    reactiveQuery: (query) => sql.reactiveQuery(query),
  };

  if (typeof window !== "undefined") {
    window.__local = wrapped;
    window.__shared = shared;
    window.__sqlocal = sql;
  }
  return wrapped;
}
