"use client";

import { LOCAL_MIGRATION_KEYS } from "@/lib/db/schema/client";
import type { MigrationManifest } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import type { SQLocalDrizzle } from "sqlocal/drizzle";

import manifest from "./migrations.json" with { type: "json" };

export async function runMigrations(sql: SQLocalDrizzle): Promise<void> {
  const { migrations } = manifest as MigrationManifest;
  if (migrations.length === 0) return;

  // SQLite default is OFF; needed for schema cascade deletes to fire.
  await sql.sql`PRAGMA foreign_keys = ON`;

  // One connection serves all reads+writes; wait out a transient lock instead of a full reopen.
  await sql.sql`PRAGMA busy_timeout = 5000`;

  // Cursor table is read before the manifest, so a normal migration can't rename it; bootstrap it.
  await migrateCursorTable(sql);

  // On a fresh DB local_migrations doesn't exist; the SELECT throws, signaling a full migration run.
  let lastTag: string | null = null;
  try {
    const rows = await sql.sql<{ tag: string }>`
      SELECT tag FROM local_migrations WHERE name = ${LOCAL_MIGRATION_KEYS.migrationVersion} LIMIT 1
    `;
    lastTag = rows[0]?.tag ?? null;
  } catch {
    lastTag = null;
  }

  // Stored tag absent from the manifest is an untrusted cursor: run every migration then reconcile, else new columns are missed.
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
        // Tolerate replays after partial application; CREATE/ADD COLUMN already-exists is harmless.
        if (isIdempotentMigrationError(err)) continue;
        throw err;
      }
    }
    await sql.sql`
      INSERT INTO local_migrations (name, tag, applied_at)
      VALUES (${LOCAL_MIGRATION_KEYS.migrationVersion}, ${m.tag}, unixepoch() * 1000)
      ON CONFLICT(name) DO UPDATE SET
        tag = excluded.tag,
        applied_at = excluded.applied_at
    `;
  }

  // Self-heal baseline drift: compare each table's stored DDL to the manifest and rebuild drifted tables. Every load, no-op if identical.
  await reconcileSchema(sql, migrations);

  // Last-resort column validation: reconcile can SKIP a rebuild (row-loss guard) or a table can drift in a
  // way the DDL compare misses, leaving a stored table missing a column the live code SELECTs - which then
  // crashes at query time with a cryptic "no such column". Catch that class here: per manifest table, add any
  // missing nullable column (cheap ALTER ADD), and LOUDLY log whatever can't be auto-fixed so it surfaces at
  // DB-open instead of as a random runtime failure.
  await validateColumns(sql, migrations);
}

// One-time rename of the legacy cursor table local_meta to local_migrations. No-op on fresh and migrated DBs.
async function migrateCursorTable(sql: SQLocalDrizzle): Promise<void> {
  const existing = await sql.sql<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('local_meta', 'local_migrations')`,
  );
  const names = new Set(existing.map((r) => r.name));
  if (!names.has("local_meta")) return; // fresh or already migrated

  // Already migrated but a stray old table lingers: just drop it.
  if (names.has("local_migrations")) {
    await sql.sql(`DROP TABLE \`local_meta\``);
    return;
  }

  await sql.sql(`CREATE TABLE \`local_migrations\` (
    \`name\` text PRIMARY KEY NOT NULL,
    \`tag\` text NOT NULL,
    \`applied_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL
  )`);
  await sql.sql(
    `INSERT INTO \`local_migrations\` (\`name\`, \`tag\`, \`applied_at\`) SELECT \`key\`, \`value\`, \`updated_at\` FROM \`local_meta\``,
  );
  await sql.sql(`DROP TABLE \`local_meta\``);
}

type TableDdl = {
  name: string;
  colDefs: string[];
  constraints: string[];
  indexes: string[];
};

const colName = (def: string) => def.match(/^`([^`]+)`/)?.[1] ?? "";

// Column defs first, constraints last: ALTER ADD must fold the new column in before constraint lines; after a PRIMARY KEY is a syntax error.
const buildCreate = (t: TableDdl) =>
  `CREATE TABLE \`${t.name}\` (\n\t${[...t.colDefs, ...t.constraints].join(",\n\t")}\n)`;

// Effective DDL per table from the manifest: later CREATE wins, ALTER ADD/DROP COLUMN folds in like SQLite's rewrite.
function parseManifestDdl(
  migrations: MigrationManifest["migrations"],
): Map<string, TableDdl> {
  const tables = new Map<string, TableDdl>();
  const statements = migrations
    .flatMap((m) => m.sql.split("--> statement-breakpoint"))
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    let m = stmt.match(/^CREATE TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\n\);?$/);
    if (m) {
      const colDefs: string[] = [];
      const constraints: string[] = [];
      for (const raw of m[2].split("\n")) {
        const line = raw.trim().replace(/,\s*$/, "");
        if (!line) continue;
        (line.startsWith("`") ? colDefs : constraints).push(line);
      }
      tables.set(m[1], { name: m[1], colDefs, constraints, indexes: [] });
      continue;
    }
    m = stmt.match(/^CREATE(?:\s+UNIQUE)?\s+INDEX\s+`[^`]+`\s+ON\s+`([^`]+)`/);
    if (m) {
      tables.get(m[1])?.indexes.push(stmt.replace(/;\s*$/, ""));
      continue;
    }
    m = stmt.match(
      /^ALTER TABLE\s+`([^`]+)`\s+ADD(?:\s+COLUMN)?\s+`([^`]+)`\s+([^;]+)/,
    );
    if (m) {
      tables.get(m[1])?.colDefs.push(`\`${m[2]}\` ${m[3].trim()}`);
      continue;
    }
    m = stmt.match(/^ALTER TABLE\s+`([^`]+)`\s+RENAME TO\s+`([^`]+)`/);
    if (m) {
      // drizzle's table-rebuild migrations (CREATE __new_x, copy, DROP x, RENAME): mirror the rename so the DDL lands under the final name.
      const t = tables.get(m[1]);
      if (t) {
        tables.delete(m[1]);
        t.name = m[2];
        tables.set(m[2], t);
      }
      continue;
    }
    m = stmt.match(/^DROP TABLE\s+(?:IF EXISTS\s+)?`([^`]+)`/);
    if (m) {
      tables.delete(m[1]);
      continue;
    }
    m = stmt.match(/^ALTER TABLE\s+`([^`]+)`\s+DROP(?:\s+COLUMN)?\s+`([^`]+)`/);
    if (m) {
      const t = tables.get(m[1]);
      if (!t) continue;
      const col = m[2];
      t.colDefs = t.colDefs.filter((def) => colName(def) !== col);
    }
  }
  return tables;
}

// Whitespace/quoting-insensitive DDL equality (SQLite's ALTER rewrite differs from drizzle only in spacing).
const normDdl = (s: string) =>
  s
    .replace(/["[\]]/g, "`")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .trim()
    .toLowerCase();

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

    // Rebuild (SQLite 12-step) from the manifest DDL: copy the column intersection, swap, recreate indexes.
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
      const before = await sql.sql<{ n: number }>(
        `SELECT count(*) AS n FROM \`${table}\``,
      );
      await sql.sql(
        `INSERT OR IGNORE INTO \`${tmp}\` (${colList}) SELECT ${colList} FROM \`${table}\``,
      );
      const after = await sql.sql<{ n: number }>(
        `SELECT count(*) AS n FROM \`${tmp}\``,
      );
      // OR IGNORE drops rows the tightened schema rejects (NOT NULL/UNIQUE/FK). Dropping COLUMNS
      // is intended; dropping ROWS is data loss, so abort the swap and keep the original table.
      const dropped = (before[0]?.n ?? 0) - (after[0]?.n ?? 0);
      if (dropped > 0) {
        await sql.sql(`DROP TABLE IF EXISTS \`${tmp}\``);
        logger.error("reconcileSchema skipped rebuild: would drop rows", {
          context: "local-db.migrations.reconcile",
          table,
          dropped,
        });
        continue;
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

// A column def is auto-addable when it has no NOT NULL (or carries a DEFAULT): ALTER ADD on an existing
// table can't add a NOT NULL column without a default. Everything else needs a rebuild we couldn't do.
function isAddableColumn(def: string): boolean {
  const upper = def.toUpperCase();
  return !/\bNOT NULL\b/.test(upper) || /\bDEFAULT\b/.test(upper);
}

// Post-reconcile safety net: ensure every column the manifest expects actually exists on the stored table.
// Adds missing nullable columns in place; loudly logs any table whose missing columns can't be auto-added
// (a NOT NULL with no default) so the drift is caught at DB-open, not as a runtime "no such column".
async function validateColumns(
  sql: SQLocalDrizzle,
  migrations: MigrationManifest["migrations"],
): Promise<void> {
  const expected = parseManifestDdl(migrations);
  const tableRows = await sql.sql<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table'`,
  );
  const existing = new Set(tableRows.map((r) => r.name));

  for (const [table, ddl] of expected) {
    if (!existing.has(table)) continue; // absent tables are a separate (create) concern
    const actual = await sql.sql<{ name: string }>(
      `PRAGMA table_info(\`${table}\`)`,
    );
    const have = new Set(actual.map((r) => r.name));
    const unfixable: string[] = [];
    for (const def of ddl.colDefs) {
      const col = colName(def);
      if (!col || have.has(col)) continue;
      if (isAddableColumn(def)) {
        try {
          await sql.sql(`ALTER TABLE \`${table}\` ADD COLUMN ${def}`);
        } catch (err) {
          if (!isIdempotentMigrationError(err)) unfixable.push(col);
        }
      } else {
        unfixable.push(col);
      }
    }
    if (unfixable.length > 0) {
      // A required (NOT NULL, no default) column is missing and reconcile's rebuild was declined (its row-loss
      // guard aborts when the existing rows can't satisfy the tightened schema). Recover by force-rebuilding
      // with a synthesized default for the missing NOT NULL columns, so rows survive AND the column exists.
      // This is the last line of defense against a cryptic runtime "no such column".
      const recovered = await forceRebuildWithDefaults(sql, table, ddl);
      const ctx = {
        context: "local-db.migrations.validate",
        table,
        missing: unfixable,
      };
      if (recovered) {
        // Success: notable (the db was drifted) but not a failure - we repaired it without data loss.
        logger.warn(
          "validateColumns: recovered a stored table missing required columns via force-rebuild",
          ctx,
        );
      } else {
        logger.error(
          "validateColumns: stored table is missing required columns and could not be auto-recovered",
          ctx,
        );
      }
    }
  }
}

// A safe literal default for a column def whose value the rebuild must synthesize (the old rows lack it).
// Honors an explicit DEFAULT; else picks an empty value by declared type. Quoted/escaped for inline SQL.
function synthDefault(def: string): string {
  const explicit = def.match(
    /\bDEFAULT\s+(.+?)(?:\s+(?:NOT NULL|UNIQUE|PRIMARY KEY|REFERENCES)\b|$)/i,
  );
  if (explicit) return explicit[1].trim();
  const lower = def.toLowerCase();
  if (/\b(integer|int|real|numeric)\b/.test(lower)) return "0";
  return "''";
}

// Force a 12-step rebuild that BACKFILLS missing NOT-NULL columns with a synthesized default, so the rebuild
// can't drop rows. Used only when validateColumns finds a required column the in-place ALTER can't add and the
// normal reconcile already declined. Returns false (and leaves the table untouched) on any failure.
async function forceRebuildWithDefaults(
  sql: SQLocalDrizzle,
  table: string,
  ddl: TableDdl,
): Promise<boolean> {
  try {
    await sql.sql`PRAGMA foreign_keys = OFF`;
    const tmp = `__recover_${table}`;
    await sql.sql(`DROP TABLE IF EXISTS \`${tmp}\``);
    await sql.sql(
      buildCreate(ddl).replace(
        /^CREATE TABLE\s+`[^`]+`/,
        `CREATE TABLE \`${tmp}\``,
      ),
    );
    const actual = await sql.sql<{ name: string }>(
      `PRAGMA table_info(\`${table}\`)`,
    );
    const have = new Set(actual.map((r) => r.name));
    // Build the SELECT: existing columns map across; missing columns get their synthesized default.
    const targets: string[] = [];
    const sources: string[] = [];
    for (const def of ddl.colDefs) {
      const col = colName(def);
      if (!col) continue;
      targets.push(`\`${col}\``);
      sources.push(have.has(col) ? `\`${col}\`` : synthDefault(def));
    }
    await sql.sql(
      `INSERT OR IGNORE INTO \`${tmp}\` (${targets.join(", ")}) SELECT ${sources.join(", ")} FROM \`${table}\``,
    );
    await sql.sql(`DROP TABLE \`${table}\``);
    await sql.sql(`ALTER TABLE \`${tmp}\` RENAME TO \`${table}\``);
    for (const idx of ddl.indexes) {
      try {
        await sql.sql(idx);
      } catch (err) {
        if (!isIdempotentMigrationError(err)) throw err;
      }
    }
    await sql.sql`PRAGMA foreign_keys = ON`;
    return true;
  } catch (err) {
    logger.error("forceRebuildWithDefaults failed", {
      context: "local-db.migrations.validate",
      table,
      error: err instanceof Error ? err.message : String(err),
    });
    try {
      await sql.sql`PRAGMA foreign_keys = ON`;
    } catch {
      // best effort
    }
    return false;
  }
}

function isIdempotentMigrationError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // sqlocal surfaces SQLite errors verbatim. These three cover every shape Drizzle currently emits.
  return (
    /already exists/i.test(msg) ||
    /duplicate column name/i.test(msg) ||
    /index .* already exists/i.test(msg)
  );
}
