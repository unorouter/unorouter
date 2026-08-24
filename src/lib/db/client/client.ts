"use client";
import { sleep } from "@/lib/utils/base";

import { env } from "@/lib/config/env";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import {
  diagnoseSql,
  newSql,
  pauseSql,
  resumeSql,
  terminateSql,
} from "@/lib/db/client/new-sql";
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
import {
  adoptSingleDatabase,
  singleDbPath,
} from "@/lib/db/client/data-migrate/adopt-single-db";
import type { LocalClient } from "@/lib/types";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { logger } from "@/lib/utils/logger";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { SQLocalDrizzle } from "sqlocal/drizzle";

let cached: Promise<LocalClient> | null = null;

// pagehide is the last point that runs on a same-tab navigation, and unlike
// unload it fires on the iOS bfcache path. Without this the incoming page finds
// the pool still held and fails TAB_LOCK.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", (e) => {
    // bfcache: the page can come back, and the next getLocalDb would be served
    // a destroyed client.
    if (e.persisted) return;
    const pending = cached;
    cached = null;
    void pending?.then((c) => c.destroy()).catch(() => {});
  });
}

export async function getLocalDb(): Promise<LocalClient | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined")
    return null;
  if (cached) return cached;
  const promise = openClient();
  cached = promise;
  try {
    return await promise;
  } catch (err) {
    cached = null;
    throw err;
  }
}

export function resetLocalDbCache() {
  cached = null;
}

const ORPHAN_MARKER = "OpfsSAHPool orphan";
export const TAB_LOCK_MARKER = "OpfsSAHPool tab-locked";

function isRecoverable(err: unknown): boolean {
  const s = String(err);
  // Retrying an orphan re-opens the same empty replacement and reports success,
  // hiding the user's data.
  if (s.includes(ORPHAN_MARKER)) return false;
  // The lock is held for the owning tab's lifetime, and every attempt is
  // another chance to tear a header.
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

// Covers a FROZEN owner; a dead one releases its Web Lock and resolves early.
const HANDOVER_TIMEOUT = 15_000;
// BroadcastChannel does not queue for handlers registered later, so a single
// `want` is lost when the owner has not finished its own open yet.
const WANT_RETRY_MS = 2_000;
// Two active tabs trade in batches instead of ping-ponging per statement.
const MIN_HOLD_MS = 2_000;

async function openMigratedSql(dbPath: string): Promise<SQLocalDrizzle> {
  let sql = newSql(dbPath);
  for (let attempt = 0; ; attempt++) {
    try {
      // The sahpool worker silently falls back to in-memory when the pool
      // install fails, which would persist nothing.
      const info = await sql.getDatabaseInfo();
      if (info.storageType !== "opfs") {
        // Several causes need opposite advice (another tab, OPFS blocked,
        // quota) and were indistinguishable in a bug report.
        const diagnosis = await diagnoseSql(sql).catch(() => undefined);
        logChatDebug("db.open.in_memory", {
          attempt,
          storageType: info.storageType,
          persisted: info.persisted,
          ...diagnosis,
        });
        throw new Error("OpfsSAHPool unavailable: fell back to in-memory");
      }
      await runMigrations(sql);
      await assertNotSilentlyEmptied(sql, dbPath);
      logChatDebug("db.open.done", { storageType: "opfs" });
      return sql;
    } catch (err) {
      if (!isRecoverable(err) || attempt >= RETRIES) {
        logChatDebug("db.open.failed", {
          attempt,
          error: String(err).slice(0, 200),
        });
        // destroy() closes the database but the pool keeps its handles, so
        // giving up without this locks the file against this very page.
        await pauseSql(sql).catch(() => {});
        await sql.destroy().catch(() => {});
        terminateSql(sql);
        throw err;
      }
      logChatDebug("db.open.retry", {
        attempt,
        error: String(err).slice(0, 200),
      });
      logger.warn("Local DB open contended; retrying", {
        context: "local-db.client",
        attempt,
        error: String(err),
      });
      await pauseSql(sql).catch(() => {});
      await sql.destroy().catch(() => {});
      terminateSql(sql);
      await sleep(Math.min(50 * 2 ** attempt, MAX_BACKOFF));
      sql = newSql(dbPath);
    }
  }
}

// Empty DB + a strictly larger file still in the pool means opfs-sahpool
// dropped a torn-header file's logical name and handed back a fresh empty one.
async function assertNotSilentlyEmptied(
  sql: SQLocalDrizzle,
  dbPath: string,
): Promise<void> {
  const info = await sql.getDatabaseInfo();
  const liveBytes = info.databaseSizeBytes ?? 0;
  const rows = await sql.sql<{ n: number }>(
    "SELECT (SELECT COUNT(*) FROM conversations) + (SELECT COUNT(*) FROM characters) + (SELECT COUNT(*) FROM lorebooks) + (SELECT COUNT(*) FROM sampling_presets) AS n",
  );
  if (Number(rows[0]?.n ?? 0) > 0) return;

  let orphanBytes = 0;
  try {
    const { salvagePoolDatabases } =
      await import("@/lib/db/client/sahpool/salvage");
    for (const candidate of await salvagePoolDatabases(dbPath)) {
      // A root `.pre-sahpool` copy is the normal leftover of a clean migration
      // and is routinely larger than a fresh empty db.
      if (candidate.source !== "pool") continue;
      if (candidate.sizeBytes > liveBytes) {
        orphanBytes = Math.max(orphanBytes, candidate.sizeBytes);
      }
    }
  } catch {
    // Cannot inspect the pool: never block a legitimately empty first run.
    return;
  }
  if (orphanBytes === 0) return;

  logChatDebug("db.open.orphan_detected", { liveBytes, orphanBytes });
  logger.error("Local DB opened empty while the pool holds a larger database", {
    context: "local-db.client",
    liveBytes,
    orphanBytes,
  });
  throw new Error(
    `${ORPHAN_MARKER}: opened an empty database while ${orphanBytes} bytes sit unreferenced in the pool`,
  );
}

// One-time migration off the pre-sahpool driver, which stored the database as a
// plain sqlite file at the OPFS root.
async function migrateLegacySqliteFile(
  sql: SQLocalDrizzle,
  dbPath: string,
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
  logChatDebug("db.migrate.sahpool.start", { bytes: file.size });
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
  // Safari has no main-thread FileSystemFileHandle.move() but createWritable
  // works, so copy first and keep the original if it fails.
  try {
    const movable: FileSystemFileHandle & {
      move?: (name: string) => Promise<void>;
    } = handle;
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
      error: String(err).slice(0, 200),
    });
    // No rollback copy, but the legacy file must STILL go: the next open would
    // re-import it wholesale and discard everything written since. The import
    // above already passed integrity_check, so the data is in the pool.
    await root.removeEntry(dbPath).catch(() => {});
  }
  logChatDebug("db.migrate.sahpool.done", { bytes: file.size });
}

async function openClient(): Promise<LocalClient> {
  const appName = env.appName.toLowerCase();
  // Not keyed by user: the id resolves after mount, so a per-user path opened
  // the empty guest file on first render and signing in stranded its writes.
  const dbPath = singleDbPath();
  // Take the Web Lock BEFORE any pool access: a second tab's failed install can
  // tear a pool header, after which the FIRST tab opens empty and looks wiped.
  const lockKey = `db:${dbPath}`;
  if (!(await acquireLock(lockKey))) {
    logChatDebug("db.open.handover_wait");
    if (!(await awaitOwnership(dbPath, lockKey))) {
      logChatDebug("db.open.tab_locked");
      throw new Error(
        `${TAB_LOCK_MARKER}: ${dbPath} is open in another tab or window`,
      );
    }
  }
  // Under the lock so two tabs cannot both adopt, and before any pool for the
  // new path exists. Swallowing a failure here would open an empty database
  // while the user's history sat in the old per-user pool.
  try {
    await adoptSingleDatabase(dbPath);
  } catch (err) {
    releaseLock(lockKey);
    throw err;
  }
  try {
    const { recoverPendingImport } =
      await import("@/lib/db/client/data-migrate/reconcile-import");
    await recoverPendingImport(dbPath, appName);
  } catch (err) {
    logChatDebug("db.open.recover_error", {
      error: String(err).slice(0, 200),
    });
  }
  // A FAILED open must hand the lock back, else the next attempt waits the
  // full HANDOVER_TIMEOUT on a tab that is never coming.
  let sql: SQLocalDrizzle;
  try {
    sql = await openMigratedSql(dbPath);
  } catch (err) {
    releaseLock(lockKey);
    throw err;
  }
  try {
    await migrateLegacySqliteFile(sql, dbPath);
  } catch (err) {
    logChatDebug("db.migrate.sahpool.failed", {
      error: String(err).slice(0, 200),
    });
    await sql.destroy().catch(() => {});
    terminateSql(sql);
    releaseLock(lockKey);
    throw err;
  }
  // Fire-and-forget: pure cleanup, must never delay or fail the open.
  void import("@/lib/db/client/data/chat/request-log")
    .then((m) => m.trimRequestLogPayloads())
    .then((n) => {
      if (n > 0) logChatDebug("db.reqlog.trimmed", { rows: n });
    })
    .catch(() => {});

  let reopening: Promise<void> | null = null;

  // `parked` means this tab gave the pool away: VFS paused, lock released, so
  // every statement path below must reacquire first. Transitions are
  // single-flight through `transition` so park and unpark never interleave.
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
    logChatDebug("db.handover.parked");
  };

  const unparkNow = async () => {
    if (!(await awaitOwnership(dbPath, lockKey))) {
      throw new Error(`${TAB_LOCK_MARKER}: handover of ${dbPath} timed out`);
    }
    try {
      await resumeSql(sql);
    } catch (err) {
      // acquireLockWaiting short-circuits on a held key, so staying parked with
      // the lock would spin instantly on every retry and starve the asking tab.
      releaseLock(lockKey);
      throw err;
    }
    parked = false;
    lastAcquiredAt = Date.now();
    logChatDebug("db.handover.resumed");
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
            error: String(err).slice(0, 200),
          });
          await pauseSql(sql).catch(() => {});
          await sql.destroy().catch(() => {});
          terminateSql(sql);
          sql = await openMigratedSql(dbPath);
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
