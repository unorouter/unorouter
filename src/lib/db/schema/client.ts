import { getTableName, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { SyncKindName } from "@/lib/validation/sync";

// Client-only schema (browser SQLocal). Server code must NEVER import this.

export type PendingSyncOp = "patch" | "delete";

// Retry queue for mirror writes that failed offline/transiently. Drained by
// a background task when network returns. `kind` + `op` use `.$type<>()` to
// narrow the column types at the type layer (SQLite has no enums).
export const localPendingSync = sqliteTable(
  "local_pending_sync",
  {
    kind: text("kind").notNull().$type<SyncKindName>(),
    id: text("id").notNull(),
    op: text("op").notNull().$type<PendingSyncOp>(),
    queuedAt: integer("queued_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    attempts: integer("attempts").notNull().default(0),
    // Exponential backoff: drain skips rows where nextAttemptAt > now.
    // Null = drain immediately (first attempt and successful retries).
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
  },
  (table) => [
    primaryKey({ columns: [table.kind, table.id] }),
    index("idx_pending_queued").on(table.queuedAt),
  ],
);

export const localMeta = sqliteTable("local_meta", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// Tables that must NEVER be cross-copied between OPFS DBs. local_meta holds
// the target DB's own migration_version cursor; local_pending_sync holds the
// per-DB mirror-write queue with userId references baked in.
export const LOCAL_ONLY_TABLES = [
  getTableName(localMeta),
  getTableName(localPendingSync),
] as const;

// Keys stored in local_meta. Migration cursor tracks the last applied tag.
export const LOCAL_META_KEYS = {
  migrationVersion: "migration_version",
} as const;
