"use client";

import type {
  CopyOptions,
  CopyResult,
  CopyRowFailure,
  LocalClient,
  LocalRawExec,
} from "@/lib/types";
import { quoteIdent } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";

// FKs disabled during copy so insert order doesn't matter. Column intersect
// kept so source/target schema drift drops extras silently. Pure on
// LocalClient — no dependency on `client.ts` so it can be reused from the
// salvage path inside openClient() without a module cycle.
export async function copyAllTables(
  source: LocalClient,
  target: LocalClient,
  opts: CopyOptions = {},
): Promise<CopyResult> {
  const skip = new Set(opts.skipTables ?? []);
  const rewrite = opts.rewrite ?? {};
  const onRowError =
    opts.onRowError ??
    ((f) =>
      logger.warn("copyAllTables row failed", {
        context: "local-db.copy",
        table: f.table,
        error: String(f.error),
      }));

  const tables = (await listTables(source.exec)).filter((t) => !skip.has(t));
  if (tables.length === 0) {
    return { copied: 0, failures: [], tables: [] };
  }

  await target.exec("PRAGMA foreign_keys = OFF", [], "run");
  const failures: CopyRowFailure[] = [];
  let copied = 0;

  try {
    for (const table of tables) {
      const tgtCols = await listColumns(target.exec, table);
      if (tgtCols.length === 0) continue;
      const tgtSet = new Set(tgtCols);

      const { rows, columns: srcCols } = await source.exec(
        `SELECT * FROM ${quoteIdent(table)}`,
        [],
        "all",
      );
      if (rows.length === 0) continue;

      const useCols = srcCols.filter((c) => tgtSet.has(c));
      if (useCols.length === 0) continue;
      const srcIdx = useCols.map((c) => srcCols.indexOf(c));

      const insertSql =
        `INSERT INTO ${quoteIdent(table)} (${useCols.map(quoteIdent).join(",")}) ` +
        `VALUES (${useCols.map(() => "?").join(",")}) ON CONFLICT DO NOTHING`;

      for (const tuple of rows as unknown[][]) {
        const params = useCols.map((col, i) =>
          col in rewrite ? rewrite[col] : tuple[srcIdx[i]],
        );
        try {
          // No `target.transaction(...)` wrapper: a throwing exec inside a
          // SQLocal transaction never releases the transactionMutex and
          // deadlocks every later DB call. FKs are already off and the insert
          // is ON CONFLICT DO NOTHING, so a bare exec is safe and idempotent.
          await target.exec(insertSql, params, "run");
          copied++;
        } catch (error) {
          const rowObj = Object.fromEntries(
            useCols.map((c, i) => [c, params[i]]),
          );
          const failure: CopyRowFailure = { table, row: rowObj, error };
          failures.push(failure);
          onRowError(failure);
        }
      }
    }
  } finally {
    await target.exec("PRAGMA foreign_keys = ON", [], "run").catch(() => {});
  }

  logger.info("copyAllTables summary", {
    context: "local-db.copy",
    tables: tables.length,
    copied,
    failures: failures.length,
  });

  return { copied, failures, tables };
}

async function listTables(exec: LocalRawExec): Promise<string[]> {
  const { rows } = await exec(
    `SELECT name FROM sqlite_master WHERE type='table'
       AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'
     ORDER BY name`,
    [],
    "all",
  );
  return (rows as unknown[][]).map((r) => r[0] as string);
}

async function listColumns(
  exec: LocalRawExec,
  table: string,
): Promise<string[]> {
  const { rows, columns } = await exec(
    `PRAGMA table_info(${quoteIdent(table)})`,
    [],
    "all",
  );
  const nameIdx = columns.indexOf("name");
  return (rows as unknown[][]).map((r) => r[nameIdx] as string);
}
