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
  terminateAllSql,
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
  stealLock,
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

// Without this the incoming page finds the pool still held and fails TAB_LOCK.
//
// bfcache is released too, though the page may come back. Holding through it
// was the safer-looking choice and is the worse one: Android discards a
// bfcached page under memory pressure without ever restoring it, so the pool
// and its Web Lock stayed held by a page that no longer exists and the next
// load in that SAME tab found the database locked by a ghost. A restore just
// reopens (getLocalDb rebuilds the cache on demand), which costs one open;
// the alternative cost the user every page in the tab until they killed it.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    const pending = cached;
    cached = null;
    void pending?.then((c) => c.destroy()).catch(() => {});
  });
}

// An import owns the live file exclusively: it reads the live DB to graft
// local-only tables, then overwrites it. Nulling the cache is not enough, since
// any query hook that calls getLocalDb() re-opens live and takes the write lock,
// and the import then blocks on it forever with the copied data already built.
let liveSuspended = false;

export function suspendLocalDb() {
  liveSuspended = true;
  cached = null;
}

export function resumeLocalDb() {
  liveSuspended = false;
}

export async function getLocalDb(): Promise<LocalClient | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined")
    return null;
  if (liveSuspended) return null;
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

async function removeOpfsEntries(): Promise<void> {
  const root = await navigator.storage.getDirectory();
  // Collect first: removing while async-iterating a directory skips entries.
  const names: string[] = [];
  for await (const [name] of root.entries()) names.push(name);
  const failed: string[] = [];
  for (const name of names) {
    try {
      await root.removeEntry(name, { recursive: true });
    } catch (err) {
      failed.push(`${name}: ${String(err).slice(0, 80)}`);
    }
  }
  if (failed.length) throw new Error(`OPFS wipe failed: ${failed.join("; ")}`);
}

// A wipe must not need a working database: the user reaching for it usually has
// one that failed to open, and the worker from that failed open still holds the
// sync access handles that make removeEntry throw NoModificationAllowedError.
export async function wipeLocalDb(): Promise<void> {
  const pending = cached;
  cached = null;
  try {
    const local = await pending;
    await local?.wipe();
    return;
  } catch {
    // Either the open never resolved, so there was no client to wipe through,
    // or the removal was refused because a worker still holds the pool. Both
    // are fixed the same way: kill every worker, then delete the files.
  }
  terminateAllSql();
  await removeOpfsEntries();
}

const ORPHAN_MARKER = "OpfsSAHPool orphan";
const TAB_LOCK_MARKER = "OpfsSAHPool tab-locked";
// Firefox throws "Security error when calling GetDirectory" for OPFS whenever
// site data is blocked for the origin: private windows, "block cookies", strict
// ETP. No amount of retrying changes that, and the browser is the only place it
// can be fixed, so it is a distinct verdict rather than a generic failure.
const BLOCKED_MARKER = "OpfsSAHPool blocked";

function isRecoverable(err: unknown): boolean {
  const s = String(err);
  // Retrying an orphan reopens the same empty replacement and reports success,
  // hiding the user's data.
  if (s.includes(ORPHAN_MARKER)) return false;
  if (s.includes(TAB_LOCK_MARKER)) return false;
  if (s.includes(BLOCKED_MARKER)) return false;
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
  // Nobody answered in HANDOVER_TIMEOUT, so the holder is gone or frozen (an
  // Android background tab runs no JS and can never reply). Its lock outlives
  // it only while the process does, and waiting longer never resolves: the user
  // saw a dead page until they closed every tab.
  //
  // Stealing is safe HERE and nowhere else. It does not create a second writer:
  // the SAH pool refuses to initialise twice, so if the holder really is alive
  // the open below still fails cleanly with the same tab-locked error. What it
  // does fix is the far more common case where the holder is already gone.
  logChatDebug("db.open.handover_steal");
  return stealLock(lockKey);
}

const HANDOVER_TIMEOUT = 15_000;
// BroadcastChannel does not queue for handlers registered later, so a single
// `want` is lost when the owner has not finished its own open yet.
const WANT_RETRY_MS = 2_000;
const MIN_HOLD_MS = 2_000;
// A hidden tab gives the pool up on its own once idle this long. Android Chrome
// stops running a background tab's JS, so a `want` sent to it is never
// answered and the visible tab times out on a lock nobody is using.
const HIDDEN_PARK_MS = 5_000;

async function openMigratedSql(dbPath: string): Promise<SQLocalDrizzle> {
  let sql = newSql(dbPath);
  for (let attempt = 0; ; attempt++) {
    try {
      // The sahpool worker silently falls back to in-memory when the pool
      // install fails, which persists nothing.
      const info = await sql.getDatabaseInfo();
      if (info.storageType !== "opfs") {
        const diagnosis = await diagnoseSql(sql).catch(() => undefined);
        logChatDebug("db.open.in_memory", {
          attempt,
          storageType: info.storageType,
          persisted: info.persisted,
          ...diagnosis,
        });
        throw new Error(
          diagnosis?.opfsReachable === false
            ? `${BLOCKED_MARKER}: the browser refused storage access for this site`
            : "OpfsSAHPool unavailable: fell back to in-memory",
        );
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
        // giving up without the pause locks the file against this very page.
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
    // The legacy file must STILL go: the next open would re-import it wholesale
    // and discard everything written since.
    await root.removeEntry(dbPath).catch(() => {});
  }
  logChatDebug("db.migrate.sahpool.done", { bytes: file.size });
}

async function openClient(): Promise<LocalClient> {
  const appName = env.appName.toLowerCase();
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
  // Never swallow: a failure here opens an empty database while the user's
  // history sits in the old per-user pool.
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
  void import("@/lib/db/client/data/chat/request-log")
    .then((m) => m.trimRequestLogPayloads())
    .then((n) => {
      if (n > 0) logChatDebug("db.reqlog.trimmed", { rows: n });
    })
    .catch(() => {});

  let reopening: Promise<void> | null = null;

  // `parked` = pool given away (VFS paused, lock released), so every statement
  // path below must reacquire first.
  let parked = false;
  let transition: Promise<void> | null = null;
  let lastAcquiredAt = Date.now();
  let inFlight = 0;
  let idleWaiters: (() => void)[] = [];

  const waitForIdle = () =>
    inFlight === 0
      ? Promise.resolve()
      : new Promise<void>((resolve) => idleWaiters.push(resolve));

  let lastRunAt = Date.now();
  let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
  const onVisibility = () => {
    if (hiddenTimer) clearTimeout(hiddenTimer);
    hiddenTimer = null;
    if (!document.hidden) return;
    const tick = () => {
      hiddenTimer = null;
      if (!document.hidden || parked) return;
      const idle = Date.now() - lastRunAt;
      // A hidden tab still streaming a reply keeps writing; leave it alone.
      if (idle < HIDDEN_PARK_MS) {
        hiddenTimer = setTimeout(tick, HIDDEN_PARK_MS - idle);
        return;
      }
      park();
    };
    hiddenTimer = setTimeout(tick, HIDDEN_PARK_MS);
  };
  document.addEventListener("visibilitychange", onVisibility);
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
      // the lock starves the asking tab.
      releaseLock(lockKey);
      throw err;
    }
    parked = false;
    lastAcquiredAt = Date.now();
    logChatDebug("db.handover.resumed");
    // A hidden tab's own queries pull the pool back; re-arm so it lets go again.
    onVisibility();
  };

  const ensureOwned = async (): Promise<void> => {
    while (transition) await transition.catch(() => {});
    if (!parked) return;
    transition = unparkNow().finally(() => (transition = null));
    await transition;
  };

  const park = () => {
    if (parked || transition) return;
    transition = parkNow().finally(() => (transition = null));
  };
  const unsubscribeWant = subscribeWant(dbPath, park);

  const detach = () => {
    unsubscribeWant();
    document.removeEventListener("visibilitychange", onVisibility);
    if (hiddenTimer) clearTimeout(hiddenTimer);
  };

  const gated = async <T>(
    fn: (s: SQLocalDrizzle) => Promise<T>,
  ): Promise<T> => {
    await ensureOwned();
    lastRunAt = Date.now();
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
    destroy: async () => {
      detach();
      await ensureOwned().catch(() => {});
      await sql.destroy();
      releaseLock(lockKey);
    },
    wipe: async () => {
      detach();
      await ensureOwned().catch(() => {});
      await sql.destroy().catch(() => {});
      terminateSql(sql);
      releaseLock(lockKey);
      await removeOpfsEntries();
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
