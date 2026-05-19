"use client";

import type { MigrationManifest } from "@/lib/types";
import type { SQLocalDrizzle } from "sqlocal/drizzle";

import manifest from "./migrations.json" with { type: "json" };

const META_KEY = "migration_version";

export async function runMigrations(sql: SQLocalDrizzle): Promise<void> {
  const { migrations } = manifest as MigrationManifest;
  if (migrations.length === 0) return;

  // On a fresh DB local_meta doesn't exist; the SELECT throws and signals to
  // run every migration from the start.
  let lastTag: string | null = null;
  try {
    const versionRows = await sql.sql<{ value: string }>`
      SELECT value FROM local_meta WHERE key = ${META_KEY} LIMIT 1
    `;
    lastTag = versionRows[0]?.value ?? null;
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
    // SQLite can't run multiple statements in one prepared call; split on
    // Drizzle's `statement-breakpoint` separator.
    const statements = m.sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    // Wrap each migration + cursor write in one transaction so partial failure
    // rolls back; next run replays cleanly.
    await sql.transaction(async () => {
      for (const statement of statements) {
        await sql.sql(statement);
      }
      await sql.sql`
        INSERT INTO local_meta (key, value, updated_at)
        VALUES (${META_KEY}, ${m.tag}, unixepoch() * 1000)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `;
    });
  }
}
