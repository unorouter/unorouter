"use client";

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
    s.includes("client has been destroyed")
  );
}

const RETRIES = 7;
const MAX_BACKOFF = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function openMigratedSql(
  dbPath: string,
  userId: number,
): Promise<SQLocalDrizzle> {
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
