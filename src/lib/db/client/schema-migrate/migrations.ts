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

      // The cursor table is read before the manifest, so a normal migration can't rename it. Bootstrap: recreate as local_migrations, copy the row, drop old.
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

        // Rebuild (SQLite 12-step): new table from manifest DDL, copy the column intersection, swap, recreate indexes.
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
          // Count before/after: OR IGNORE silently drops rows the tightened schema rejects, so surface the loss.
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
      // sqlocal surfaces SQLite errors verbatim. These three cover every shape Drizzle currently emits.
  return (
    /already exists/i.test(msg) ||
    /duplicate column name/i.test(msg) ||
    /index .* already exists/i.test(msg)
  );
}
