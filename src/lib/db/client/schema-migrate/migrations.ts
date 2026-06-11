"use client";

import { LOCAL_META_KEYS } from "@/lib/db/schema/client";
import type { MigrationManifest } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import {
  buildCreate,
  colName,
  normDdl,
  parseManifestDdl,
} from "./schema-ddl";
import type { SQLocalDrizzle } from "sqlocal/drizzle";

import manifest from "./migrations.json" with { type: "json" };

export async function runMigrations(sql: SQLocalDrizzle): Promise<void> {
  const { migrations } = manifest as MigrationManifest;
  if (migrations.length === 0) return;

  // SQLite default is OFF; needed for schema cascade deletes to fire.
  await sql.sql`PRAGMA foreign_keys = ON`;

  // On a fresh DB local_meta doesn't exist; the SELECT throws and signals to
  // run every migration from the start.
  let lastTag: string | null = null;
  try {
    const rows = await sql.sql<{ value: string }>`
      SELECT value FROM local_meta WHERE key = ${LOCAL_META_KEYS.migrationVersion} LIMIT 1
    `;
    lastTag = rows[0]?.value ?? null;
  } catch {
    lastTag = null;
  }

  // Stored tag absent from the manifest (rebuilt baseline) = untrusted cursor:
  // run every migration (idempotent) then reconcile columns, else new columns
  // are silently missed (the old column-mismatch failures).
  const knownTag = lastTag && migrations.some((m) => m.tag === lastTag);
  const startIndex = knownTag
    ? migrations.findIndex((m) => m.tag === lastTag) + 1
    : 0;

  for (let i = startIndex; i < migrations.length; i++) {
    const m = migrations[i];
    // Split on statement-breakpoint; no tx wrapper (SQLocal mutex deadlock).
    const statements = m.sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      try {
        await sql.sql(statement);
      } catch (err) {
        // Tolerate replays after partial application;
        // CREATE/ADD COLUMN already-exists is harmless.
        if (isIdempotentMigrationError(err)) continue;
        throw err;
      }
    }
    await sql.sql`
      INSERT INTO local_meta (key, value, updated_at)
      VALUES (${LOCAL_META_KEYS.migrationVersion}, ${m.tag}, unixepoch() * 1000)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `;
  }

  // Self-heal drift from in-place regenerated baselines: compare each table's
  // stored DDL to the manifest and rebuild drifted tables, recovering every row
  // the new schema accepts. Runs every load, no-op when identical.
  await reconcileSchema(sql, migrations);
}

async function reconcileSchema(
  sql: SQLocalDrizzle,
  migrations: MigrationManifest["migrations"],
): Promise<void> {
  const expected = parseManifestDdl(migrations);
  const masterRows = await sql.sql<{ name: string; sql: string }>(
    `SELECT name, sql FROM sqlite_master WHERE type = 'table'`,
  );
  const stored = new Map(masterRows.map((r) => [r.name, r.sql]));

  let fkOff = false;
  for (const [table, ddl] of expected) {
    const current = stored.get(table);
    const create = buildCreate(ddl);
    // Absent tables were just created by the migration replay above.
    if (!current || normDdl(current) === normDdl(create)) continue;

    // Rebuild (SQLite 12-step): new table from manifest DDL, copy the column
    // intersection with OR IGNORE (rows violating new constraints drop, the
    // rest survive), swap, recreate indexes.
    if (!fkOff) {
      await sql.sql`PRAGMA foreign_keys = OFF`;
      fkOff = true;
    }
    const tmp = `__rebuild_${table}`;
    await sql.sql(`DROP TABLE IF EXISTS \`${tmp}\``);
    await sql.sql(
      create.replace(/^CREATE TABLE\s+`[^`]+`/, `CREATE TABLE \`${tmp}\``),
    );
    const actual = await sql.sql<{ name: string }>(
      `PRAGMA table_info(\`${table}\`)`,
    );
    const shared = ddl.colDefs
      .map(colName)
      .filter((c) => actual.some((r) => r.name === c));
    if (shared.length > 0) {
      const colList = shared.map((c) => `\`${c}\``).join(", ");
      // Count before/after: OR IGNORE silently drops rows the tightened schema
      // (NOT NULL / UNIQUE / FK) rejects, so surface the loss instead of
      // vanishing data without a trace.
      const before = await sql.sql<{ n: number }>(
        `SELECT count(*) AS n FROM \`${table}\``,
      );
      await sql.sql(
        `INSERT OR IGNORE INTO \`${tmp}\` (${colList}) SELECT ${colList} FROM \`${table}\``,
      );
      const after = await sql.sql<{ n: number }>(
        `SELECT count(*) AS n FROM \`${tmp}\``,
      );
      const dropped = (before[0]?.n ?? 0) - (after[0]?.n ?? 0);
      if (dropped > 0) {
        logger.warn("reconcileSchema dropped rows on rebuild", {
          context: "local-db.migrations.reconcile",
          table,
          sourceRows: before[0]?.n ?? 0,
          keptRows: after[0]?.n ?? 0,
          dropped,
        });
      }
    }
    await sql.sql(`DROP TABLE \`${table}\``);
    await sql.sql(`ALTER TABLE \`${tmp}\` RENAME TO \`${table}\``);
    for (const idx of ddl.indexes) {
      try {
        await sql.sql(idx);
      } catch (err) {
        if (!isIdempotentMigrationError(err)) throw err;
      }
    }
  }
  if (fkOff) await sql.sql`PRAGMA foreign_keys = ON`;
}

function isIdempotentMigrationError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // sqlocal surfaces SQLite errors verbatim. These three cover every
  // shape Drizzle currently emits.
  return (
    /already exists/i.test(msg) ||
    /duplicate column name/i.test(msg) ||
    /index .* already exists/i.test(msg)
  );
}
