"use client";

import type { SQLocalDrizzle } from "sqlocal/drizzle";

// ---------------------------------------------------------------------------
// Client-side migration replay. The build step `scripts/bundle-migrations.ts`
// reads every `drizzle/client/*.sql` plus the journal and emits this JSON.
// At runtime we compare it against the `local_meta.migration_version` row
// and apply any missing migrations in order.
// ---------------------------------------------------------------------------

import manifest from "./migrations.json" with { type: "json" };

type MigrationEntry = { tag: string; sql: string };
type Manifest = { migrations: MigrationEntry[] };

const META_KEY = "migration_version";

export async function runMigrations(sql: SQLocalDrizzle): Promise<void> {
  const { migrations } = manifest as Manifest;
  if (migrations.length === 0) return;

  // Try to read the last applied migration tag. On a fresh DB the local_meta
  // table does not exist yet, so the SELECT throws — that's the signal to
  // run every migration from the start. After the first run the table exists
  // (it's created by the bundled CREATE TABLE) and subsequent boots
  // short-circuit at the matching tag.
  let lastTag: string | null = null;
  try {
    const versionRows = await sql.sql<{ value: string }>`
      SELECT value FROM local_meta WHERE key = ${META_KEY} LIMIT 1
    `;
    const lastApplied = versionRows[0]?.value
      ? JSON.parse(versionRows[0].value)
      : null;
    lastTag = lastApplied?.tag ?? null;
  } catch {
    lastTag = null;
  }

  let startIndex = 0;
  if (lastTag) {
    const matched = migrations.findIndex((m) => m.tag === lastTag);
    startIndex = matched >= 0 ? matched + 1 : 0;
  }

  for (let i = startIndex; i < migrations.length; i++) {
    const m = migrations[i];
    // Drizzle migrations use `statement-breakpoint` between separate
    // CREATE/ALTER statements. SQLite cannot execute multiple statements in
    // one prepared call, so split.
    const statements = m.sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await sql.sql([statement] as unknown as TemplateStringsArray);
    }
    await sql.sql`
      INSERT INTO local_meta (key, value, updated_at)
      VALUES (${META_KEY}, ${JSON.stringify({ tag: m.tag })}, unixepoch() * 1000)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `;
  }
}
