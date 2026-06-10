"use client";

import { GUEST_USER_ID, IS_DEV } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import type { LocalClient } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { LOCAL_ONLY_TABLES } from "@/lib/db/schema/client";
import { copyAllTables } from "./data-migrate/copy";

// Per-user OPFS file; lazy WASM import. Type aug: `@/lib/types/sqlocal.d.ts`.

let cached = new Map<number, Promise<LocalClient>>();

export async function getLocalDb(
  userId: number | undefined = GUEST_USER_ID,
): Promise<LocalClient | null> {
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

// Clearing site data while the app is open deletes the OPFS file under the
// live SyncAccessHandle; later statements reject with GetSyncHandleError +
// NotFoundError or SQLITE_CORRUPT (the VFS reads incoherent orphaned pages)
// and chat persistence dies silently until a full reload. Reopening routes
// through the salvage-capable open, so a genuinely corrupt-but-present file
// gets the copy-rescue path rather than a blind wipe.
function isRecoverableDbError(err: unknown): boolean {
  const s = String(err);
  return (
    s.includes("GetSyncHandleError") ||
    s.includes("NotFoundError") ||
    s.includes("SQLITE_CORRUPT") ||
    s.includes("SQLITE_IOERR")
  );
}

type Reopen = () => Promise<SQLocalDrizzle>;

function buildLocalClient(sql: SQLocalDrizzle, reopen?: Reopen): LocalClient {
  let current = sql;
  let reopening: Promise<void> | null = null;

  // Single-flight: detect the dead handle, swap in a freshly opened DB
  // (recreates file + schema) and replay the failed statement once. The
  // statement never executed on the dead handle, so the retry is safe.
  async function guard<T>(fn: (s: SQLocalDrizzle) => Promise<T>): Promise<T> {
    try {
      return await fn(current);
    } catch (err) {
      if (!reopen || !isRecoverableDbError(err)) throw err;
      logger.warn("OPFS handle lost (site data cleared?); reopening local DB", {
        context: "local-db.client",
        error: String(err),
      });
      reopening ??= (async () => {
        await current.destroy().catch(() => {});
        current = await reopen();
      })().finally(() => {
        reopening = null;
      });
      await reopening;
      return fn(current);
    }
  }

  const db = drizzle(
    (sqlStr, params, method) => guard((s) => s.driver(sqlStr, params, method)),
    (queries) => guard((s) => s.batchDriver(queries)),
    { schema: { ...shared, ...client } },
  );
  return {
    db,
    exec: (sqlStr, params, method) =>
      guard((s) => s.exec(sqlStr, params, method)),
    transaction: (cb) => guard((s) => s.transaction(cb)),
    destroy: () => current.destroy(),
    deleteDatabaseFile: () => current.deleteDatabaseFile(),
    getDatabaseFile: () => current.getDatabaseFile(),
    overwriteDatabaseFile: (file) => current.overwriteDatabaseFile(file),
    reactiveQuery: (...args: Parameters<SQLocalDrizzle["reactiveQuery"]>) =>
      current.reactiveQuery(...args),
  };
}

// Sweep orphan `.recover-*` files from crashed salvage.
async function sweepRecoveryFiles(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return;
  }
  try {
    const root = await navigator.storage.getDirectory();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for await (const [name] of root.entries()) {
      const match = name.match(/\.recover-(\d+)$/);
      if (!match) continue;
      const ts = Number(match[1]);
      if (Number.isFinite(ts) && ts < cutoff) {
        await root.removeEntry(name).catch(() => {});
      }
    }
  } catch (err) {
    logger.debug("OPFS recovery sweep failed", {
      context: "local-db.client",
      error: String(err),
    });
  }
}

// Open + migrate, with the salvage cascade on failure. Used for the initial
// open AND the in-place reopen after a recoverable handle loss.
async function openMigratedSql(
  dbPath: string,
  userId: number,
): Promise<SQLocalDrizzle> {
  const { SQLocalDrizzle } = await import("sqlocal/drizzle");
  let sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });

  const { runMigrations } = await import("./schema-migrate/migrations");
  try {
    await runMigrations(sql);
  } catch (err) {
    // Migration failed (corrupt/incompatible local DB). Salvage cascade (runs
    // in prod too): 1) build a fresh migrated DB, 2) copy surviving rows across
    // by column-name intersect, 3) overwrite the broken file with the rescued
    // bytes. If the copy itself fails, fall back to a clean wipe so the app at
    // least loads. The reconcileColumns pass inside runMigrations heals the
    // common drift case before it ever throws, so this is the rare hard-failure
    // path. Conversation/RP data uses app-generated text IDs (no autoincrement),
    // so copied rows keep their IDs with no resequencing.
    logger.warn("Local DB migration failed; attempting salvage", {
      context: "local-db.client",
      userId,
      error: String(err),
    });

    const tempPath = `${dbPath}.recover-${Date.now()}`;
    let fresh: SQLocalDrizzle | null = null;
    try {
      fresh = new SQLocalDrizzle({ databasePath: tempPath, reactive: false });
      await runMigrations(fresh);
      const brokenClient = buildLocalClient(sql);
      const freshClient = buildLocalClient(fresh);
      const result = await copyAllTables(brokenClient, freshClient, {
        skipTables: LOCAL_ONLY_TABLES,
      });
      logger.info("Local DB salvage copy complete", {
        context: "local-db.client.salvage",
        userId,
        rows: result.copied,
        failures: result.failures.length,
      });
      const blob = await fresh.getDatabaseFile();
      await sql.overwriteDatabaseFile(blob);
      await fresh.destroy().catch(() => {});
      await new SQLocalDrizzle({ databasePath: tempPath, reactive: false })
        .deleteDatabaseFile()
        .catch(() => {});
      fresh = null;
      await sql.destroy().catch(() => {});
      sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });
    } catch (salvageErr) {
      logger.error("Local DB salvage failed; falling back to wipe", {
        context: "local-db.client.salvage",
        userId,
        error: String(salvageErr),
      });
      await fresh?.destroy().catch(() => {});
      await sql.deleteDatabaseFile().catch(() => {});
      await sql.destroy().catch(() => {});
      sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });
      await runMigrations(sql);
    }
  }

  return sql;
}

async function openClient(userId: number): Promise<LocalClient> {
  const dbPath = `${env.appName.toLowerCase()}-${userId}.sqlite3`;

  // Fire-and-forget: don't block first-load on a directory scan.
  void sweepRecoveryFiles();

  const sql = await openMigratedSql(dbPath, userId);
  const wrapped = buildLocalClient(sql, () => openMigratedSql(dbPath, userId));

  // Release SAH on unload (Chromium orphan state).
  // Cache eviction before destroy for BFcache.
  if (typeof window !== "undefined") {
    const release = () => {
      cached.delete(userId);
      void wrapped.destroy().catch(() => {});
    };
    window.addEventListener("pagehide", release, { once: true });
    window.addEventListener("beforeunload", release, { once: true });
    // Dev-only globals; XSS exposes local DB.
    if (IS_DEV) {
      window.__local = wrapped;
      window.__shared = shared;
      window.__sqlocal = sql;
    }
  }
  return wrapped;
}

export function resetLocalDbCache() {
  cached = new Map();
}
