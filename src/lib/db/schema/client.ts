import { getTableName, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { SyncKindName } from "@/lib/validation/sync-constants";

// Client-only schema (browser SQLocal). Server code must NEVER import this.

export type PendingSyncOp = "patch" | "delete";

// Deferred background work, drained on load with backoff. "sync" pushes to the
// sync API (rebuilt from local state); "logEnrich" pulls a request's
// authoritative cost/tokens/channel from new-api after the stream settled.
export type PendingTaskType = "sync" | "logEnrich";

// Outbox: the push/pull path for deferred work. No payload snapshots for sync
// (the drainer rebuilds from current local state, so coalescing N rapid edits
// into one row stays correct); task-specific args ride `payload`.
export const localPendingTasks = sqliteTable(
  "local_pending_tasks",
  {
    // Task variant; selects the drain handler.
    taskType: text("task_type")
      .notNull()
      .default("sync")
      .$type<PendingTaskType>(),
    // sync: SyncKindName. logEnrich: the entity kind ("conversations") or "".
    kind: text("kind").notNull().$type<SyncKindName | "">(),
    // Entity id: convId/msgId/etc. depending on taskType.
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
    // sync conversations only: CSV union of scopes queued since last drain
    // ("full" | "row" | "bindings" | "msgs"). "full" absorbs the rest.
    // Null for delete ops and non-conversation kinds (always full row).
    hint: text("hint"),
    // sync conversations only: JSON array of message ids for the "msgs" scope.
    msgIds: text("msg_ids"),
    // Task-specific args as JSON (e.g. logEnrich stores {"requestId":"..."}).
    payload: text("payload"),
    // Bumped on every enqueue; drain deletes the row only when seq is
    // unchanged, so hints enqueued mid-push survive for the next drain.
    seq: integer("seq").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.taskType, table.kind, table.id] }),
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
  getTableName(localPendingTasks),
] as const;

// Keys stored in local_meta. Migration cursor tracks the last applied tag.
export const LOCAL_META_KEYS = {
  migrationVersion: "migration_version",
} as const;
