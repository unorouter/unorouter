"use client";
import { sleep } from "@/lib/utils/base";

import { env } from "@/lib/config/env";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import {
  diagnoseSql,
  exportPoolFileSql,
  newSql,
  pauseSql,
  resumeSql,
  terminateAllSql,
  terminateSql,
  unlinkPoolFileSql,
  pauseAllSql,
  unloadAllSql,
} from "@/lib/db/client/new-sql";
import {
  requestOwnership,
  subscribeWant,
} from "@/lib/db/client/sahpool/db-ownership";
import {
  acquireLock,
  acquireLockWaiting,
  releaseAllLocks,
  releaseLock,
  stealLock,
} from "@/lib/db/client/outbox/resource-lock";
import { runMigrations } from "@/lib/db/client/schema-migrate/migrations";
import {
  adoptSingleDatabase,
  singleDbPath,
} from "@/lib/db/client/data-migrate/adopt-single-db";
import type { LocalClient } from "@/lib/types";
import { debugFlag, logChatDebug } from "@/lib/utils/chat-debug-log";
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
//
// The worker is terminated SYNCHRONOUSLY rather than through destroy(): that
// path awaits a round trip to the worker before it terminates anything, and an
// unloading page is not given the time, so the worker survived still holding
// the pool's sync access handles. Closing the tab did not free them either
// (a killed page runs no more code), which is why the only fix a user found
// was quitting the whole browser.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (debugFlag("nounload")) {
      logChatDebug("db.pagehide", { mode: "pause" });
      pauseAllSql();
      releaseAllLocks();
      return;
    }
    logChatDebug("db.pagehide", { mode: "unload" });
    cached = null;
    unloadAllSql(UNLOAD_GRACE_MS);
    // iOS fires pagehide on an app switch and keeps the page alive; with the
    // worker gone the park that follows can never finish, so without this the
    // pool lock stays held until the page dies and every other tab waits the
    // whole handover timeout out.
    releaseAllLocks();
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
    const client = await promise;
    dbOpenFailed = false;
    lastOpenError = null;
    return client;
  } catch (err) {
    // Every query hook calls this, and a pool another page still holds fails
    // the same way for all of them: a fresh open per hook spawned a worker
    // each and ran the phone hot. One failure is shared for a while instead.
    setTimeout(() => {
      if (cached === promise) cached = null;
    }, FAIL_HOLD_MS);
    lastOpenError = String(err);
    // The banner cannot ask the DB whether the DB opened, and a browser that
    // refuses the pool (ungoogled-chromium forks with site data off) still
    // answers getDirectory(), so the probe alone reports nothing wrong.
    dbOpenFailed = true;
    for (const listener of openFailureListeners) listener();
    throw err;
  }
}

const FAIL_HOLD_MS = 10_000;
const UNLOAD_GRACE_MS = 300;
let dbOpenFailed = false;
let lastOpenError: string | null = null;
const openFailureListeners = new Set<() => void>();

export function localDbOpenFailed(): boolean {
  return dbOpenFailed;
}

// "held" is another page's worker still on the pool (a tab in the background,
// or the page this one replaced); "blocked" is the browser refusing storage.
export function localDbOpenErrorKind(): "blocked" | "held" | null {
  if (!dbOpenFailed || !lastOpenError) return null;
  if (lastOpenError.includes(BLOCKED_MARKER)) return "blocked";
  if (
    lastOpenError.includes(TAB_LOCK_MARKER) ||
    lastOpenError.includes("NoModificationAllowedError") ||
    lastOpenError.includes("available file slots") ||
    lastOpenError.includes("OpfsSAHPool")
  )
    return "held";
  return "blocked";
}

export function retryLocalDbOpen(): void {
  cached = null;
  dbOpenFailed = false;
  lastOpenError = null;
  for (const listener of openFailureListeners) listener();
}

export function subscribeLocalDbOpenFailure(listener: () => void): () => void {
  openFailureListeners.add(listener);
  return () => openFailureListeners.delete(listener);
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

// A pool held by a page that is still shutting down frees up on WebKit's own
// schedule, well past the few seconds a fixed retry count covered.
const CONTENDED_BUDGET_MS = 20_000;
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
// A hidden tab gives the pool up as soon as nothing is in flight, polling this
// often while something is. Android Chrome stops running a background tab's
// JS, so a `want` sent to it is never answered; iOS Safari freezes the tab
// within seconds of hiding, and a frozen owner keeps its OPFS access handles,
// which no lock steal can take back: the next tab opens with no database until
// every tab is closed.
const HIDDEN_PARK_POLL_MS = 250;
const PARK_DEFER_LOG_MS = 2_000;
const GATED_SLOW_MS = 5_000;
// A hidden tab that still reports work in flight after this long is not going
// to finish it before iOS freezes the tab, and a frozen owner keeps its
// handles. Park anyway; a worker that does not answer the pause is killed.
const FORCE_PARK_MS = 10_000;
// Closing the pool's eight sync access handles is one IPC each on iOS and
// exceeded 3 s on a phone with a tiny database, so the worker was killed and
// reopened on nearly every hide.
const WORKER_REPLY_MS = 8_000;

async function openMigratedSql(dbPath: string): Promise<SQLocalDrizzle> {
  const t0 = Date.now();
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
      logChatDebug("db.open.done", {
        storageType: "opfs",
        ms: Date.now() - t0,
        attempt,
      });
      return sql;
    } catch (err) {
      if (!isRecoverable(err) || Date.now() - t0 > CONTENDED_BUDGET_MS) {
        logChatDebug("db.open.failed", {
          attempt,
          error: String(err).slice(0, 200),
        });
        // destroy() closes the database but the pool keeps its handles, so
        // giving up without the pause locks the file against this very page.
        // skipOptimize because sqlocal runs `PRAGMA optimize` FIRST: with no
        // db (the open just failed) that throws "Driver not initialized" and
        // takes the close with it, so every retry stacked another worker on
        // the same file and the contention never cleared.
        await pauseSql(sql).catch(() => {});
        await sql.destroy(true).catch(() => {});
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
      await sql.destroy(true).catch(() => {});
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
  logChatDebug("db.open.start");
  // Take the Web Lock BEFORE any pool access: a second tab's failed install can
  // tear a pool header, after which the FIRST tab opens empty and looks wiped.
  const lockKey = `db:${dbPath}`;
  const lockOk = await acquireLock(lockKey);
  logChatDebug("db.open.lock", { ok: lockOk });
  if (!lockOk) {
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
    logChatDebug("db.open.worker_spawn");
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
    await sql.destroy(true).catch(() => {});
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

  let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
  const onVisibility = () => {
    if (hiddenTimer) clearTimeout(hiddenTimer);
    hiddenTimer = null;
    if (!document.hidden) return;
    const hiddenAt = Date.now();
    let deferralLogged = false;
    const tick = () => {
      hiddenTimer = null;
      if (!document.hidden || parked) return;
      if (inFlight > 0 && Date.now() - hiddenAt < FORCE_PARK_MS) {
        // Two exports in a row showed the image tab never parking after it
        // was hidden; this names the statement that kept it.
        if (!deferralLogged && Date.now() - hiddenAt > PARK_DEFER_LOG_MS) {
          deferralLogged = true;
          logChatDebug("db.park.deferred", {
            inFlight,
            sinceMs: Date.now() - hiddenAt,
            labels: [...inFlightLabels].slice(0, 4),
          });
        }
        hiddenTimer = setTimeout(tick, HIDDEN_PARK_POLL_MS);
        return;
      }
      park(true, inFlight > 0);
    };
    tick();
  };
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("freeze", onVisibility);
  // A worker that stops answering keeps the pool's handles until it is
  // killed; every call that was waiting on it is dead with it.
  let workerDead = false;
  const killWorker = (reason: string) => {
    logChatDebug("db.worker.killed", {
      reason,
      inFlight,
      labels: [...inFlightLabels].slice(0, 4),
    });
    terminateSql(sql);
    workerDead = true;
    inFlight = 0;
    inFlightLabels.clear();
    idleWaiters.forEach((resolve) => resolve());
    idleWaiters = [];
  };
  const answered = async (op: Promise<unknown>): Promise<boolean> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), WORKER_REPLY_MS);
    });
    try {
      return await Promise.race([op.then(() => true), timeout]);
    } finally {
      clearTimeout(timer);
    }
  };

  const parkNow = async (hidden: boolean, force: boolean) => {
    const heldFor = Date.now() - lastAcquiredAt;
    if (!hidden && heldFor < MIN_HOLD_MS) await sleep(MIN_HOLD_MS - heldFor);
    if (!force) await waitForIdle();
    const t0 = Date.now();
    try {
      if (!workerDead && !(await answered(pauseSql(sql))))
        killWorker("pause_timeout");
    } finally {
      parked = true;
      releaseLock(lockKey);
      logChatDebug("db.handover.parked", {
        pauseMs: Date.now() - t0,
        hidden,
        ...(force && { forced: true }),
      });
    }
  };

  const unparkNow = async () => {
    if (!(await awaitOwnership(dbPath, lockKey))) {
      throw new Error(`${TAB_LOCK_MARKER}: handover of ${dbPath} timed out`);
    }
    try {
      if (workerDead) {
        sql = await openMigratedSql(dbPath);
        workerDead = false;
      } else if (!(await answered(resumeSql(sql)))) {
        killWorker("resume_timeout");
        sql = await openMigratedSql(dbPath);
        workerDead = false;
      }
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

  const park = (hidden = false, force = false) => {
    if (parked || transition) {
      if (hidden && transition)
        logChatDebug("db.park.skipped", { reason: "transition" });
      return;
    }
    transition = parkNow(hidden, force).finally(() => (transition = null));
  };
  const unsubscribeWant = subscribeWant(dbPath, () => park());

  const detach = () => {
    unsubscribeWant();
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("freeze", onVisibility);
    if (hiddenTimer) clearTimeout(hiddenTimer);
  };

  const inFlightLabels = new Set<string>();
  const gated = async <T>(
    fn: (s: SQLocalDrizzle) => Promise<T>,
    label = "op",
  ): Promise<T> => {
    await ensureOwned();
    inFlight++;
    inFlightLabels.add(label);
    const t0 = Date.now();
    const slow = setTimeout(() => {
      logChatDebug("db.gated.slow", {
        label,
        ms: Date.now() - t0,
        hidden: document.hidden,
        parked,
      });
    }, GATED_SLOW_MS);
    try {
      return await fn(sql);
    } finally {
      clearTimeout(slow);
      inFlight--;
      inFlightLabels.delete(label);
      if (inFlight === 0) {
        idleWaiters.forEach((resolve) => resolve());
        idleWaiters = [];
      }
    }
  };

  const run = <T>(
    fn: (s: SQLocalDrizzle) => Promise<T>,
    label?: string,
  ): Promise<T> =>
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
          await sql.destroy(true).catch(() => {});
          terminateSql(sql);
          sql = await openMigratedSql(dbPath);
        })().finally(() => (reopening = null));
        await reopening;
        return fn(sql);
      }
    }, label);

  const db = drizzle(
    (q, params, method) =>
      run((s) => s.driver(q, params, method), q.slice(0, 60)),
    (queries) => run((s) => s.batchDriver(queries), "batch"),
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
      await sql.destroy(true).catch(() => {});
      terminateSql(sql);
      releaseLock(lockKey);
      await removeOpfsEntries();
    },
    deleteDatabaseFile: () => gated((s) => s.deleteDatabaseFile()),
    getDatabaseFile: () => gated((s) => s.getDatabaseFile()),
    exportPoolFile: (name, filename) =>
      gated(async (s) => {
        const data = await exportPoolFileSql(s, name);
        return new File([data], filename, { type: "application/x-sqlite3" });
      }),
    unlinkPoolFile: (name) => gated((s) => unlinkPoolFileSql(s, name)),
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
