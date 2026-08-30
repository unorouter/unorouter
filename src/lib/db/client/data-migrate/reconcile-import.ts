"use client";

import { env } from "@/lib/config/env";
import { LOCAL_ONLY_TABLES } from "@/lib/db/schema/client";
import { newSql, terminateSql } from "@/lib/db/client/new-sql";
import { singleDbPath } from "@/lib/db/client/data-migrate/adopt-single-db";
import { sahPoolDirName } from "@/lib/db/client/sahpool/pool-name";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { logger } from "@/lib/utils/logger";
import type { SQLocalDrizzle } from "sqlocal/drizzle";

export type ReconcileImportResult = {
  imported: number;
  skipped: number;
  tables: number;
  skippedByTable: { table: string; skipped: number }[];
};

const INSERT_BATCH = 200;

const GRAFT_FROM_LIVE = LOCAL_ONLY_TABLES.filter(
  (t) => t !== "local_migrations",
);

async function tableNames(sql: SQLocalDrizzle): Promise<string[]> {
  const rows = await sql.sql<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
  );
  return rows.map((r) => r.name);
}

async function columnNames(
  sql: SQLocalDrizzle,
  table: string,
): Promise<string[]> {
  const rows = await sql.sql<{ name: string }>(
    `PRAGMA table_info(\`${table}\`)`,
  );
  return rows.map((r) => r.name);
}

async function countRows(sql: SQLocalDrizzle, table: string): Promise<number> {
  const rows = await sql.sql<{ n: number }>(
    `SELECT count(*) AS n FROM \`${table}\``,
  );
  return rows[0]?.n ?? 0;
}

async function integrityOk(sql: SQLocalDrizzle): Promise<boolean> {
  try {
    const rows = await sql.sql<{ integrity_check: string }>(
      `PRAGMA integrity_check`,
    );
    return rows[0]?.integrity_check === "ok";
  } catch {
    return false;
  }
}

async function copyTable(
  source: SQLocalDrizzle,
  target: SQLocalDrizzle,
  table: string,
  cols: string[],
): Promise<number> {
  const colList = cols.map((c) => `\`${c}\``).join(", ");
  const placeholders = `(${cols.map(() => "?").join(", ")})`;
  const rows = await source.sql<Record<string, unknown>>(
    `SELECT ${colList} FROM \`${table}\``,
  );
  if (rows.length === 0) return 0;

  const before = await countRows(target, table);
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const batch = rows.slice(i, i + INSERT_BATCH);
    const values = batch.map(() => placeholders).join(", ");
    const params: unknown[] = [];
    for (const row of batch) {
      for (const c of cols) {
        params.push(row[c] ?? null);
      }
    }
    await target.sql(
      `INSERT OR IGNORE INTO \`${table}\` (${colList}) VALUES ${values}`,
      ...params,
    );
  }
  const after = await countRows(target, table);
  return after - before;
}

async function copySharedTables(
  source: SQLocalDrizzle,
  target: SQLocalDrizzle,
  result: ReconcileImportResult,
): Promise<void> {
  const skip = new Set<string>(LOCAL_ONLY_TABLES);
  const sourceTables = new Set(await tableNames(source));
  for (const table of await tableNames(target)) {
    if (skip.has(table) || !sourceTables.has(table)) continue;
    const targetCols = await columnNames(target, table);
    const srcCols = new Set(await columnNames(source, table));
    const shared = targetCols.filter((c) => srcCols.has(c));
    if (shared.length === 0) continue;

    const available = await countRows(source, table);
    const inserted = await copyTable(source, target, table, shared);
    const skipped = available - inserted;
    result.tables += 1;
    result.imported += inserted;
    result.skipped += skipped;
    if (skipped > 0) result.skippedByTable.push({ table, skipped });
    logChatDebug("import.reconcile.copy", { table, inserted, skipped });
  }
}

async function readBytes(sql: SQLocalDrizzle): Promise<ArrayBuffer> {
  // Structured-cloning a File/Blob across the worker boundary throws
  // DataCloneError, so overwriteDatabaseFile only ever gets an ArrayBuffer.
  const file = await sql.getDatabaseFile();
  return file.arrayBuffer();
}

// Drops only a legacy plain file at the OPFS root; pool contents need
// deleteDatabaseFile as well, else a scratch pool keeps a full-size copy.
async function removeOpfsFile(path: string): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(path).catch(() => {});
  } catch {
    // OPFS unavailable.
  }
}

async function cleanup(
  handle: SQLocalDrizzle | null,
  label: string,
  removePath: string | null,
): Promise<void> {
  if (!handle) return;
  if (removePath) {
    await handle.deleteDatabaseFile().catch((err) =>
      logChatDebug("import.reconcile.cleanup_failed", {
        handle: `${label}.delete`,
        error: String(err).slice(0, 200),
      }),
    );
  }
  await handle.destroy().catch((err) =>
    logChatDebug("import.reconcile.cleanup_failed", {
      handle: `${label}.destroy`,
      error: String(err).slice(0, 200),
    }),
  );
  // destroy() leaves the worker (and the pool's sync access handles) alive, so
  // without terminate the next open fails NoModificationAllowedError.
  terminateSql(handle);
  if (removePath) await removeOpfsFile(removePath);
}

// INVARIANT: live is written EXACTLY ONCE, after a complete replacement is
// built in a detached file, so a crash can never leave it half-imported.
export async function reconcileImport(
  buffer: ArrayBuffer,
): Promise<ReconcileImportResult> {
  const appName = env.appName.toLowerCase();
  const livePath = singleDbPath();
  const workPath = `${appName}-import.sqlite3`;
  const finalPath = `${appName}-final.sqlite3`;
  const backupPath = backupImportPath(appName);
  const { runMigrations } = await import("../schema-migrate/migrations");

  const result: ReconcileImportResult = {
    imported: 0,
    skipped: 0,
    tables: 0,
    skippedByTable: [],
  };

  let work: SQLocalDrizzle | null = null;
  let final: SQLocalDrizzle | null = null;
  let live: SQLocalDrizzle | null = null;
  let liveSrc: SQLocalDrizzle | null = null;
  let swapped = false;
  let rolledBack = false;

  logChatDebug("import.reconcile.start", { bytes: buffer.byteLength });
  try {
    // Phase 0: snapshot live to backup.
    {
      const src = newSql(livePath);
      let liveBytes: ArrayBuffer;
      try {
        liveBytes = await readBytes(src);
      } finally {
        await src.destroy().catch(() => {});
        terminateSql(src);
      }
      const backup = newSql(backupPath);
      try {
        await backup.overwriteDatabaseFile(liveBytes);
      } finally {
        await backup.destroy().catch(() => {});
        terminateSql(backup);
      }
      logChatDebug("import.reconcile.snapshot", {
        bytes: liveBytes.byteLength,
      });
    }

    // Phase 1: forward-migrate the dump.
    work = newSql(workPath);
    await work.overwriteDatabaseFile(buffer);
    await runMigrations(work);

    // Phase 2: build the replacement detached.
    final = newSql(finalPath);
    await runMigrations(final);
    await final.sql`PRAGMA foreign_keys = OFF`;
    await copySharedTables(work, final, result);
    liveSrc = newSql(livePath);
    const finalTables = new Set(await tableNames(final));
    const liveTables = new Set(await tableNames(liveSrc));
    for (const table of GRAFT_FROM_LIVE) {
      if (!finalTables.has(table) || !liveTables.has(table)) continue;
      const targetCols = await columnNames(final, table);
      const srcCols = new Set(await columnNames(liveSrc, table));
      const shared = targetCols.filter((c) => srcCols.has(c));
      if (shared.length === 0) continue;
      await copyTable(liveSrc, final, table, shared);
    }
    await final.sql`PRAGMA foreign_keys = ON`;
    await liveSrc.destroy().catch(() => {});
    terminateSql(liveSrc);
    liveSrc = null;

    // Phase 3: the single write to live.
    if (!(await integrityOk(final))) {
      throw new Error("built import db failed integrity_check");
    }
    const finalBytes = await readBytes(final);
    live = newSql(livePath);
    // Set BEFORE the write: a throw mid-overwrite leaves live torn, and the flag
    // is what keeps the backup on disk for rollback and recoverPendingImport.
    swapped = true;
    await live.overwriteDatabaseFile(finalBytes);

    // Phase 4: a corrupt swap routes into rollback.
    if (!(await integrityOk(live))) {
      throw new Error("live db failed integrity_check after swap");
    }

    logChatDebug("import.reconcile.done", {
      imported: result.imported,
      skipped: result.skipped,
      tables: result.tables,
    });
    return result;
  } catch (err) {
    logChatDebug("import.reconcile.error", {
      error: String(err).slice(0, 200),
      swapped,
    });
    logger.error("reconcileImport failed", {
      context: "local-db.reconcile-import",
      error: String(err),
    });
    // Phase 5: rollback.
    if (swapped) {
      rolledBack = await restoreLiveFromBackup(livePath, backupPath, live);
    }
    throw err;
  } finally {
    await cleanup(work, "work", workPath);
    await cleanup(final, "final", finalPath);
    await cleanup(liveSrc, "liveSrc", null);
    await cleanup(live, "live", null);
    // A failed rollback leaves this copy the only intact one; its presence is
    // what recoverPendingImport keys on.
    if (!swapped || rolledBack) await deleteBackup(backupPath);
  }
}

async function restoreLiveFromBackup(
  livePath: string,
  backupPath: string,
  liveHandle: SQLocalDrizzle | null,
): Promise<boolean> {
  try {
    const backup = newSql(backupPath);
    let backupBytes: ArrayBuffer;
    try {
      backupBytes = await readBytes(backup);
    } finally {
      await backup.destroy().catch(() => {});
      terminateSql(backup);
    }
    const live = liveHandle ?? newSql(livePath);
    await live.overwriteDatabaseFile(backupBytes);
    if (live !== liveHandle) {
      await live.destroy().catch(() => {});
      terminateSql(live);
    }
    logChatDebug("import.reconcile.rollback", { restored: true });
    return true;
  } catch (err) {
    logChatDebug("import.reconcile.rollback", {
      restored: false,
      error: String(err).slice(0, 200),
    });
    logger.error("reconcileImport rollback failed", {
      context: "local-db.reconcile-import",
      error: String(err),
    });
    return false;
  }
}

async function deleteBackup(backupPath: string): Promise<void> {
  await removeOpfsFile(backupPath);
  if (await sahPoolDirExists(backupPath)) {
    const backup = newSql(backupPath);
    await backup.deleteDatabaseFile().catch(() => {});
    await backup.destroy().catch(() => {});
    terminateSql(backup);
  }
}

// Probes WITHOUT opening, because opening auto-creates the pool. An emptied
// pool keeps its directory, so presence alone is not "backup exists".
async function sahPoolDirExists(databasePath: string): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.getDirectoryHandle(sahPoolDirName(databasePath));
    return true;
  } catch {
    return false;
  }
}

async function sahPoolBackupHasContent(backupPath: string): Promise<boolean> {
  if (!(await sahPoolDirExists(backupPath))) return false;
  const probe = newSql(backupPath);
  try {
    const rows = await probe.sql<{ n: number }>(
      "SELECT count(*) AS n FROM sqlite_master",
    );
    return (rows[0]?.n ?? 0) > 0;
  } catch {
    return false;
  } finally {
    await probe.destroy().catch(() => {});
    terminateSql(probe);
  }
}

function backupImportPath(appName: string): string {
  return `${appName}-import-backup.sqlite3`;
}

// MUST run BEFORE openMigratedSql.
export async function recoverPendingImport(
  livePath: string,
  appName: string,
): Promise<void> {
  const backupPath = backupImportPath(appName);
  let exists = false;
  try {
    const root = await navigator.storage.getDirectory();
    for await (const [name] of root.entries()) {
      if (name === backupPath) {
        exists = true;
        break;
      }
    }
  } catch {
    return;
  }
  // Non-legacy backups live in the backup path's pool, not at the OPFS root.
  if (!exists) exists = await sahPoolBackupHasContent(backupPath);
  if (!exists) return;

  logChatDebug("import.reconcile.recover.start", {});
  const live = newSql(livePath);
  try {
    const liveOk = await integrityOk(live);
    if (!liveOk) {
      await restoreLiveFromBackup(livePath, backupPath, live);
      logChatDebug("import.reconcile.recover.restored", {});
    } else {
      logChatDebug("import.reconcile.recover.live_intact", {});
    }
  } finally {
    await live.destroy().catch(() => {});
    terminateSql(live);
    await deleteBackup(backupPath);
  }
}
