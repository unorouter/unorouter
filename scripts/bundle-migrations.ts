#!/usr/bin/env bun
import { log } from "console";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Bundles `drizzle/client/*.sql` into one JSON shipped to the browser. SQLocal
// replays entries newer than `local_migrations.migration_version` at runtime.

const root = resolve(import.meta.dirname, "..");
const clientDir = resolve(root, "drizzle/client");
const outFile = resolve(
  root,
  "src/lib/db/client/schema-migrate/migrations.json",
);

const journalPath = resolve(clientDir, "meta/_journal.json");
let journal: { entries: Array<{ idx: number; tag: string }> } = {
  entries: [],
};
try {
  journal = JSON.parse(readFileSync(journalPath, "utf8"));
} catch {
  console.warn(
    `bundle-migrations: no journal at ${journalPath}; emitting empty bundle.`,
  );
  writeFileSync(outFile, JSON.stringify({ migrations: [] }, null, 2));
  process.exit(0);
}

const entries = journal.entries
  .slice()
  .sort((a, b) => a.idx - b.idx)
  .map((entry) => {
    // Drizzle tags look like "0000_aberrant_sharon_ventura" matching the
    // generated SQL filename. Read SQL by filename, not by walking
    // readdirSync, so the journal order is authoritative.
    const file = readdirSync(clientDir).find((f) => f.startsWith(entry.tag));
    if (!file) {
      throw new Error(
        `bundle-migrations: no SQL file for journal entry ${entry.tag}`,
      );
    }
    const sql = readFileSync(resolve(clientDir, file), "utf8");
    return { tag: entry.tag, sql };
  });

writeFileSync(outFile, JSON.stringify({ migrations: entries }, null, 2));

log(
  `bundle-migrations: emitted ${entries.length} migration(s) to ${outFile}`,
);
