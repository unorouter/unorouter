import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// Client-only schema (browser SQLocal). Server code must NEVER import this.

// Retry queue for mirror writes that failed offline/transiently. Drained by
// a background task when network returns.
export const localPendingSync = sqliteTable(
  "local_pending_sync",
  {
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    op: text("op").notNull(), // "patch" | "delete"
    queuedAt: integer("queued_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    attempts: integer("attempts").notNull().default(0),
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
  localMeta._.name,
  localPendingSync._.name,
] as const;
