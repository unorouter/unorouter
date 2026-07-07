"use client";

import { env } from "@/lib/config/env";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { LOCAL_ONLY_TABLES } from "@/lib/db/schema/client";
import { newSql } from "@/lib/db/client/new-sql";
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

const USER_ID_COL = "user_id";

async function copyTable(
  source: SQLocalDrizzle,
  target: SQLocalDrizzle,
  table: string,
  cols: string[],
  targetUserId: number,
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
        params.push(c === USER_ID_COL ? targetUserId : (row[c] ?? null));
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

export async function reconcileImport(
  userId: number | undefined,
  buffer: ArrayBuffer,
): Promise<ReconcileImportResult> {
  const uid = userId ?? GUEST_USER_ID;
  const appName = env.appName.toLowerCase();
  const livePath = `${appName}-${uid}.sqlite3`;
  const scratchPath = `${appName}-${uid}-import.sqlite3`;
  const { runMigrations } = await import("../schema-migrate/migrations");

  const skip = new Set<string>(LOCAL_ONLY_TABLES);
  const result: ReconcileImportResult = {
    imported: 0,
    skipped: 0,
    tables: 0,
    skippedByTable: [],
  };

  let scratch: SQLocalDrizzle | null = null;
  let live: SQLocalDrizzle | null = null;
  logChatDebug("import.reconcile.start", {
    userId: uid,
    bytes: buffer.byteLength,
  });
  try {
    scratch = newSql(scratchPath);
    await scratch.overwriteDatabaseFile(buffer);
    await runMigrations(scratch);

    live = newSql(livePath);
    await live.sql`PRAGMA foreign_keys = OFF`;
    for (const table of await tableNames(live)) {
      await live.sql(`DROP TABLE IF EXISTS \`${table}\``);
    }
    await runMigrations(live);

    await live.sql`PRAGMA foreign_keys = OFF`;
    const sourceTables = new Set(await tableNames(scratch));
    for (const table of await tableNames(live)) {
      if (skip.has(table) || !sourceTables.has(table)) continue;
      const liveCols = await columnNames(live, table);
      const srcCols = new Set(await columnNames(scratch, table));
      const shared = liveCols.filter((c) => srcCols.has(c));
      if (shared.length === 0) continue;

      const available = await countRows(scratch, table);
      const inserted = await copyTable(scratch, live, table, shared, uid);
      const skipped = available - inserted;
      result.tables += 1;
      result.imported += inserted;
      result.skipped += skipped;
      if (skipped > 0) result.skippedByTable.push({ table, skipped });
      logChatDebug("import.reconcile.copy", { table, inserted, skipped });
    }
    await live.sql`PRAGMA foreign_keys = ON`;

    logChatDebug("import.reconcile.done", {
      imported: result.imported,
      skipped: result.skipped,
      tables: result.tables,
    });
    return result;
  } catch (err) {
    logChatDebug("import.reconcile.error", {
      error: String(err).slice(0, 200),
    });
    logger.error("reconcileImport failed", {
      context: "local-db.reconcile-import",
      userId: uid,
      error: String(err),
    });
    throw err;
  } finally {
    try {
      await scratch?.deleteDatabaseFile();
    } catch (err) {
      logChatDebug("import.reconcile.cleanup_failed", {
        handle: "scratch.delete",
        error: String(err).slice(0, 200),
      });
    }
    await scratch?.destroy().catch((err) =>
      logChatDebug("import.reconcile.cleanup_failed", {
        handle: "scratch.destroy",
        error: String(err).slice(0, 200),
      }),
    );
    await live?.destroy().catch((err) =>
      logChatDebug("import.reconcile.cleanup_failed", {
        handle: "live.destroy",
        error: String(err).slice(0, 200),
      }),
    );
  }
}
