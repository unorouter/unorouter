"use client";

import { LOCAL_ONLY_TABLES } from "@/lib/db/schema/client";
import { logger } from "@/lib/utils/logger";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { copyAllTables } from "./data-migrate/copy";

// Connection lifecycle layer: owns opening (with the migration salvage
// cascade) and in-place recovery. client.ts only wires the LocalClient
// surface on top of `LocalDbConnection.run`.

// Clearing site data while the app is open deletes the OPFS file under the
// live SyncAccessHandle; later statements reject with GetSyncHandleError +
// NotFoundError or SQLITE_CORRUPT/IOERR (the VFS reads orphaned pages). The
// OPFS/wasm boundary only surfaces stringly-typed errors, so classification
// is string sniffing by necessity, contained here.
function isRecoverableDbError(err: unknown): boolean {
  const s = String(err);
  return (
    s.includes("GetSyncHandleError") ||
    s.includes("NotFoundError") ||
    s.includes("SQLITE_CORRUPT") ||
    s.includes("SQLITE_IOERR")
  );
}

// Open + migrate, with the salvage cascade on failure: 1) build a fresh
// migrated DB at a temp path, 2) copy surviving rows by column intersect,
// 3) overwrite the broken file. Copy failure falls back to a clean wipe.
// Runs in prod too; reconcileColumns inside runMigrations heals common drift
// before this ever throws. App-generated text IDs survive the copy as-is.
export async function openMigratedSql(
  dbPath: string,
  userId: number,
): Promise<SQLocalDrizzle> {
  const { SQLocalDrizzle } = await import("sqlocal/drizzle");
  let sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });

  const { runMigrations } = await import("./schema-migrate/migrations");
  try {
    await runMigrations(sql);
  } catch (err) {
    logger.warn("Local DB migration failed; attempting salvage", {
      context: "local-db.connection",
      userId,
      error: String(err),
    });

    const tempPath = `${dbPath}.recover-${Date.now()}`;
    let fresh: SQLocalDrizzle | null = null;
    try {
      fresh = new SQLocalDrizzle({ databasePath: tempPath, reactive: false });
      await runMigrations(fresh);
      const result = await copyAllTables(
        { exec: sql.exec.bind(sql) },
        { exec: fresh.exec.bind(fresh) },
        { skipTables: LOCAL_ONLY_TABLES },
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
    } catch (salvageErr) {
      logger.error("Local DB salvage failed; falling back to wipe", {
        context: "local-db.connection.salvage",
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

export class LocalDbConnection {
  private reopening: Promise<void> | null = null;

  constructor(
    private sql: SQLocalDrizzle,
    private dbPath: string,
    private userId: number,
  ) {}

  /**
   * Run a statement with self-heal: on a recoverable handle loss the
   * connection single-flight reopens (salvage-capable, recreates a deleted
   * file + schema) and replays the statement once. The statement never
   * executed on the dead handle, so the replay is safe.
   */
  async run<T>(fn: (sql: SQLocalDrizzle) => Promise<T>): Promise<T> {
    try {
      return await fn(this.sql);
    } catch (err) {
      if (!isRecoverableDbError(err)) throw err;
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
