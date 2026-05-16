import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Client-only schema: lives in the browser SQLocal database. Never created
// on the Turso server. Server code must NEVER import this file.
// ---------------------------------------------------------------------------

// Retry queue for mirror writes that failed while offline or due to a
// transient server error. Each row is one pending op against a specific
// synced entity. A background task drains this when the network returns.
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

// Singleton key-value config for the local DB: last applied migration
// version, last hydration timestamp, schema version, etc.
export const localMeta = sqliteTable("local_meta", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});
