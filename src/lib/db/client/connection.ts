"use client";

import { getTableName } from "drizzle-orm";
import { localMigrations } from "@/lib/db/schema/client";
import { logger } from "@/lib/utils/logger";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { copyAllTables } from "./data-migrate/copy";

// Connection lifecycle: owns opening (with the migration salvage cascade) and in-place recovery. client.ts wires LocalClient.

// OPFS only surfaces stringly errors, so sniff strings here. TWO distinct classes:
//
// CONTENTION (transient): the SyncAccessHandle is held/lost, not the data. Cause: a prior
// tab's handle hasn't released yet on reload (release() on pagehide is fire-and-forget, so
// the new open can race it), or site-data was cleared mid-session. The FILE IS FINE. Recover
// by retrying the open; NEVER salvage or wipe on these (doing so deletes intact user data).
function isContentionDbError(err: unknown): boolean {
  const s = String(err);
  return (
    s.includes("GetSyncHandleError") ||
    s.includes("createSyncAccessHandle") ||
    s.includes("NoModificationAllowedError") ||
    s.includes("InvalidStateError") ||
    s.includes("NotFoundError") ||
    s.includes("SQLITE_IOERR") ||
    s.includes("SQLITE_CANTOPEN") ||
    s.includes("SQLITE_BUSY")
  );
}

// CORRUPTION (genuine): the DB file itself is unreadable/malformed. Only this class warrants
// the salvage->copy path. Even here we never blind-wipe: a failed salvage rethrows so a retry
// can run, rather than destroying a file that might still be partially recoverable.
function isCorruptionDbError(err: unknown): boolean {
  const s = String(err);
  return (
    s.includes("SQLITE_CORRUPT") ||
    s.includes("malformed") ||
    s.includes("file is not a database") ||
    s.includes("SQLITE_NOTADB")
  );
}

const RECOVERABLE_OPEN_RETRIES = 6;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Open + migrate. Contention -> retry the open (a racing tab's handle releases in ms). Genuine
// corruption -> salvage (fresh DB, copy surviving rows, overwrite); a failed salvage RETHROWS,
// never wipes, so intact data is never destroyed by a transient hiccup.
export async function openMigratedSql(
  dbPath: string,
  userId: number,
): Promise<SQLocalDrizzle> {
  const { SQLocalDrizzle } = await import("sqlocal/drizzle");
  const { runMigrations } = await import("./schema-migrate/migrations");

  let sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });
  let lastErr: unknown;

  for (let attempt = 0; attempt <= RECOVERABLE_OPEN_RETRIES; attempt++) {
    try {
      await runMigrations(sql);
      return sql;
    } catch (err) {
      lastErr = err;

      // Transient handle contention: the file is fine. Reopen and retry with backoff. NO wipe.
      if (isContentionDbError(err) && attempt < RECOVERABLE_OPEN_RETRIES) {
        logger.warn("Local DB open contended (handle busy/lost); retrying", {
          context: "local-db.connection",
          userId,
          attempt,
          error: String(err),
        });
        await sql.destroy().catch(() => {});
        await sleep(50 * 2 ** attempt); // 50,100,200,400,800,1600ms
        sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });
        continue;
      }

      // Genuine corruption: salvage. Anything else (incl. exhausted contention retries) rethrows.
      if (!isCorruptionDbError(err)) throw err;
      break;
    }
  }

  logger.warn("Local DB corrupt; attempting salvage", {
    context: "local-db.connection",
    userId,
    error: String(lastErr),
  });

  const tempPath = `${dbPath}.recover-${Date.now()}`;
  let fresh: SQLocalDrizzle | null = null;
  try {
    fresh = new SQLocalDrizzle({ databasePath: tempPath, reactive: false });
    await runMigrations(fresh);
    const result = await copyAllTables(
      { exec: sql.exec.bind(sql) },
      { exec: fresh.exec.bind(fresh) },
      // Same-DB recovery keeps the outbox (un-pushed changes would be lost); only the migration cursor resets.
      { skipTables: [getTableName(localMigrations)] },
    );
    logger.info("Local DB salvage copy complete", {
      context: "local-db.connection.salvage",
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
    return sql;
  } catch (salvageErr) {
    // Do NOT wipe: a transient failure here must not destroy a file that may still recover on
    // the next open. Clean up the temp DB and rethrow so getLocalDb drops the cache and retries.
    logger.error("Local DB salvage failed; preserving file (no wipe)", {
      context: "local-db.connection.salvage",
      userId,
      error: String(salvageErr),
    });
    await fresh?.destroy().catch(() => {});
    await new SQLocalDrizzle({ databasePath: tempPath, reactive: false })
      .deleteDatabaseFile()
      .catch(() => {});
    await sql.destroy().catch(() => {});
    throw salvageErr;
  }
}

export class LocalDbConnection {
  private reopening: Promise<void> | null = null;

  constructor(
    private sql: SQLocalDrizzle,
    private dbPath: string,
    private userId: number,
  ) {}

  // Self-heal: on recoverable handle loss, single-flight reopen and replay once. It never ran on the dead handle, so replay safe.
  async run<T>(fn: (sql: SQLocalDrizzle) => Promise<T>): Promise<T> {
    try {
      return await fn(this.sql);
    } catch (err) {
      // Both handle contention and corruption warrant a reopen; openMigratedSql routes each (retry vs salvage) safely.
      if (!isContentionDbError(err) && !isCorruptionDbError(err)) throw err;
      logger.warn("OPFS handle lost (site data cleared?); reopening local DB", {
        context: "local-db.connection",
        userId: this.userId,
        error: String(err),
      });
      this.reopening ??= (async () => {
        await this.sql.destroy().catch(() => {});
        this.sql = await openMigratedSql(this.dbPath, this.userId);
      })().finally(() => {
        this.reopening = null;
      });
      await this.reopening;
      return fn(this.sql);
    }
  }

  /** Lifecycle/file ops bind to the live instance, no recovery wrapping. */
  get current(): SQLocalDrizzle {
    return this.sql;
  }
}
