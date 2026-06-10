"use client";

import { LOCAL_META_KEYS } from "@/lib/db/schema/client";
import type { MigrationManifest } from "@/lib/types";
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

type TableDdl = {
  name: string;
  colDefs: string[];
  constraints: string[];
  indexes: string[];
};

const colName = (def: string) => def.match(/^`([^`]+)`/)?.[1] ?? "";

// Column defs first, table constraints last: ALTER ADD must fold the new
// column in BEFORE constraint lines (matching SQLite's sqlite_master rewrite);
// appending after a PRIMARY KEY(...) line is a syntax error.
const buildCreate = (t: TableDdl) =>
  `CREATE TABLE \`${t.name}\` (\n\t${[...t.colDefs, ...t.constraints].join(",\n\t")}\n)`;

// Effective DDL per table from the manifest (trusted drizzle-kit output, light
// regexes safe): later CREATE wins, ALTER ADD/DROP COLUMN folds in like SQLite
// rewrites sqlite_master.
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
      // drizzle's table-rebuild migrations: CREATE __new_x, copy, DROP x,
      // RENAME __new_x TO x. Mirror the rename so the expected DDL ends up
      // under the final name (SQLite rewrites sqlite_master the same way).
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

// Whitespace/quoting-insensitive DDL equality (SQLite's ALTER rewrite of
// sqlite_master differs from drizzle's formatting in spacing only).
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
      await sql.sql(
        `INSERT OR IGNORE INTO \`${tmp}\` (${colList}) SELECT ${colList} FROM \`${table}\``,
      );
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
