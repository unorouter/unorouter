import { getTableName, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { SyncMergeMode } from "@/lib/validation/sync";
import type { SyncKindName } from "@/lib/validation/sync-constants";

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
    // JSON-stringified snapshot of the original mirror-call payload. Drain
    // pushes this verbatim, preserving delta-append shape + scope across
    // retries (avoids buildSyncPayload widening to full bundle replace).
    // Null only for delete ops, which carry no payload.
    payloadJson: text("payload_json"),
    // Preserves the mergeMode passed to the original mirror call. Null for
    // delete ops or patch ops that omitted mergeMode (server default = replace).
    mergeMode: text("merge_mode").$type<SyncMergeMode>(),
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

// Tables never cross-copied between OPFS DBs (per-DB cursors/queues).
export const LOCAL_ONLY_TABLES = [
  getTableName(localMeta),
  getTableName(localPendingSync),
] as const;

// Keys stored in local_meta. Migration cursor tracks the last applied tag.
export const LOCAL_META_KEYS = {
  migrationVersion: "migration_version",
} as const;
