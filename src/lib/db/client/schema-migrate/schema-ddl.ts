import type { MigrationManifest } from "@/lib/types";

// Pure DDL reconstruction from the bundled migration manifest. No SQLocal/OPFS
// here so it runs in plain node (the build-time reconcile guard imports it).

export type TableDdl = {
  name: string;
  colDefs: string[];
  constraints: string[];
  indexes: string[];
};

export const colName = (def: string) => def.match(/^`([^`]+)`/)?.[1] ?? "";

// Column defs first, table constraints last: ALTER ADD must fold the new
// column in BEFORE constraint lines (matching SQLite's sqlite_master rewrite);
// appending after a PRIMARY KEY(...) line is a syntax error.
export const buildCreate = (t: TableDdl) =>
  `CREATE TABLE \`${t.name}\` (\n\t${[...t.colDefs, ...t.constraints].join(",\n\t")}\n)`;

// Effective DDL per table from the manifest (trusted drizzle-kit output, light
// regexes safe): later CREATE wins, ALTER ADD/DROP COLUMN folds in like SQLite
// rewrites sqlite_master.
export function parseManifestDdl(
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
export const normDdl = (s: string) =>
  s
    .replace(/["[\]]/g, "`")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .trim()
    .toLowerCase();
