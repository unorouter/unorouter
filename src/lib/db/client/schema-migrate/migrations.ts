"use client";

import { LOCAL_MIGRATION_KEYS } from "@/lib/db/schema/client";
import type { MigrationManifest } from "@/lib/types";
import { errMessage } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { logger } from "@/lib/utils/logger";
import type { SQLocalDrizzle } from "sqlocal/drizzle";

import manifest from "./migrations.json" with { type: "json" };

export async function runMigrations(sql: SQLocalDrizzle): Promise<void> {
  const { migrations }: MigrationManifest = manifest;
  if (migrations.length === 0) return;

  await sql.sql`PRAGMA foreign_keys = ON`;

  await sql.sql`PRAGMA busy_timeout = 5000`;

  await migrateCursorTable(sql);

  let lastTag: string | null = null;
  try {
    const rows = await sql.sql<{ tag: string }>`
      SELECT tag FROM local_migrations WHERE name = ${LOCAL_MIGRATION_KEYS.migrationVersion} LIMIT 1
    `;
    lastTag = rows[0]?.tag ?? null;
  } catch {
    lastTag = null;
  }

  const knownTag = lastTag && migrations.some((m) => m.tag === lastTag);
  const startIndex = knownTag
    ? migrations.findIndex((m) => m.tag === lastTag) + 1
    : 0;

  const driftReplay = !knownTag;

  for (let i = startIndex; i < migrations.length; i++) {
    const m = migrations[i];
    const statements = m.sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      try {
        await sql.sql(statement);
      } catch (err) {
        if (isIdempotentMigrationError(err)) continue;
        if (driftReplay) {
          const msg = errMessage(err);
          logChatDebug("migration.replay_tolerated", {
            tag: m.tag,
            error: msg.slice(0, 200),
          });
          logger.warn("runMigrations: tolerated replay error on drifted DB", {
            context: "local-db.migrations.replay",
            error: msg,
          });
          continue;
        }
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

  await reconcileSchema(sql, migrations);

  await ensureTables(sql, migrations);

  await validateColumns(sql, migrations);
}

// Recreate any manifest table entirely absent from the DB. A partial/aborted
// migration (or an OPFS write that never landed the CREATE) can leave the file
// missing a whole table, and every query against it dies with "no such table"
// (e.g. the media attachment adapter). validateColumns deliberately skips
// absent tables; this is the create half. The whole schema is idempotent, so
// recreating from the manifest DDL is safe and loses no data (the table had
// none). Runs BEFORE validateColumns so the freshly created table also gets
// column-checked.
async function ensureTables(
  sql: SQLocalDrizzle,
  migrations: MigrationManifest["migrations"],
): Promise<void> {
  const expected = parseManifestDdl(migrations);
  const tableRows = await sql.sql<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table'`,
  );
  const existing = new Set(tableRows.map((r) => r.name));

  for (const [table, ddl] of expected) {
    if (existing.has(table)) continue;
    try {
      await sql.sql(buildCreate(ddl));
      // Per index: one that cannot be created must not cost the table the rest,
      // several of which carry UNIQUE constraints other code relies on.
      for (const index of ddl.indexes) {
        try {
          await sql.sql(index);
        } catch (err) {
          if (!isIdempotentMigrationError(err)) throw err;
        }
      }
      logChatDebug("ensure.table_created", { table });
      logger.warn("ensureTables: recreated a table missing from the OPFS db", {
        context: "local-db.migrations.ensure",
        table,
      });
    } catch (err) {
      if (isIdempotentMigrationError(err)) continue;
      logger.error("ensureTables: failed to recreate a missing table", {
        context: "local-db.migrations.ensure",
        table,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

async function migrateCursorTable(sql: SQLocalDrizzle): Promise<void> {
  const existing = await sql.sql<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('local_meta', 'local_migrations')`,
  );
  const names = new Set(existing.map((r) => r.name));
  if (!names.has("local_meta")) return; // fresh or already migrated

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

const countRows = async (sql: SQLocalDrizzle, table: string) =>
  (await sql.sql<{ n: number }>(`SELECT count(*) AS n FROM \`${table}\``))[0]
    ?.n ?? 0;

const buildCreate = (t: TableDdl) =>
  `CREATE TABLE \`${t.name}\` (\n\t${[...t.colDefs, ...t.constraints].join(",\n\t")}\n)`;

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
    m = stmt.match(/^DROP INDEX\s+(?:IF EXISTS\s+)?`([^`]+)`/);
    if (m) {
      const dropped = m[1];
      for (const t of tables.values()) {
        t.indexes = t.indexes.filter(
          (idx) => !new RegExp(`INDEX\\s+\`${dropped}\``, "i").test(idx),
        );
      }
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
    if (!current || normDdl(current) === normDdl(create)) continue;

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
      const before = await countRows(sql, table);
      await sql.sql(
        `INSERT OR IGNORE INTO \`${tmp}\` (${colList}) SELECT ${colList} FROM \`${table}\``,
      );
      const dropped = before - (await countRows(sql, tmp));
      if (dropped > 0) {
        await sql.sql(`DROP TABLE IF EXISTS \`${tmp}\``);
        logChatDebug("reconcile.row_loss_abort", { table, dropped });
        logger.error("reconcileSchema skipped rebuild: would drop rows", {
          context: "local-db.migrations.reconcile",
          table,
          dropped,
        });
        continue;
      }
    }
    logChatDebug("reconcile.rebuild", { table });
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

function isAddableColumn(def: string): boolean {
  const upper = def.toUpperCase();
  return !/\bNOT NULL\b/.test(upper) || /\bDEFAULT\b/.test(upper);
}

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
          logChatDebug("validate.column_added", { table, col });
        } catch (err) {
          if (!isIdempotentMigrationError(err)) unfixable.push(col);
        }
      } else {
        unfixable.push(col);
      }
    }
    if (unfixable.length > 0) {
      const recovered = await forceRebuildWithDefaults(sql, table, ddl);
      const ctx = {
        context: "local-db.migrations.validate",
        table,
        missing: unfixable,
      };
      logChatDebug("validate.force_rebuild", {
        table,
        missing: unfixable,
        recovered,
      });
      if (recovered) {
        logger.warn(
          "validateColumns: recovered a stored tbl missing required columns via force-rebuild",
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

function synthDefault(def: string): string {
  const explicit = def.match(
    /\bDEFAULT\s+(.+?)(?:\s+(?:NOT NULL|UNIQUE|PRIMARY KEY|REFERENCES)\b|$)/i,
  );
  if (explicit) return explicit[1].trim();
  const lower = def.toLowerCase();
  if (/\b(integer|int|real|numeric)\b/.test(lower)) return "0";
  return "''";
}

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
    const abort = async (reason: string) => {
      await sql.sql(`DROP TABLE IF EXISTS \`${tmp}\``);
      logger.error(`forceRebuildWithDefaults aborted: ${reason}`, {
        context: "local-db.migrations.validate",
        table,
      });
      return false;
    };

    const targets: string[] = [];
    const sources: string[] = [];
    for (const def of ddl.colDefs) {
      const col = colName(def);
      if (!col) continue;
      // A synthesized constant cannot satisfy a key: every row gets the same
      // value and INSERT OR IGNORE then keeps exactly one of them.
      if (!have.has(col) && /\b(PRIMARY KEY|UNIQUE)\b/i.test(def))
        return abort(`cannot synthesize key column ${col}`);
      targets.push(`\`${col}\``);
      sources.push(have.has(col) ? `\`${col}\`` : synthDefault(def));
    }
    const before = await countRows(sql, table);
    await sql.sql(
      `INSERT OR IGNORE INTO \`${tmp}\` (${targets.join(", ")}) SELECT ${sources.join(", ")} FROM \`${table}\``,
    );
    if ((await countRows(sql, tmp)) < before) return abort("would drop rows");
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
      error: errMessage(err),
    });
    try {
      await sql.sql`PRAGMA foreign_keys = ON`;
    } catch {}
    return false;
  }
}

function isIdempotentMigrationError(err: unknown): boolean {
  const msg = errMessage(err);
  return (
    /already exists/i.test(msg) ||
    /duplicate column name/i.test(msg) ||
    /index .* already exists/i.test(msg) ||
    // replayed DROP after a partially applied migration (no transaction wrapper)
    /no such (index|column|table)/i.test(msg)
  );
}
