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

  const startIndex = lastTag
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
