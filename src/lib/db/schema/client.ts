import type { SyncKindName } from "@/lib/validation/sync-constants";
import { getTableName, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

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
    // sync: SyncKindName. Non-sync tasks (logEnrich) store "" (PK members can't
    // be null in SQLite); the queue ALWAYS writes kind explicitly and maps
    // "" <-> null at its single read/write boundary, so handlers see a clean
    // SyncKindName | null and the column needs no DB default.
    kind: text("kind").notNull().$type<SyncKindName | "">(),
    // Entity id: convId/msgId/etc. depending on taskType.
    id: text("id").notNull(),
    op: text("op").notNull().$type<PendingSyncOp>(),
    queuedAt: integer("queued_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    attempts: integer("attempts").notNull().default(0),
    // Backoff: drain skips rows where nextAttemptAt > now. Null = drain now.
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    // Per-task JSON args. logEnrich: {requestId}. sync conversations:
    // {hint, msgIds} (scope CSV + msg ids); other sync kinds leave it null.
    payload: text("payload"),
    // Bumped on every enqueue; drain deletes the row only when seq is
    // unchanged, so a scope enqueued mid-drain survives for the next pass.
    seq: integer("seq").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.taskType, table.kind, table.id] }),
    index("idx_pending_queued").on(table.queuedAt),
  ],
);

// Per-device migration cursor: one row tracks the last applied migration tag.
export const localMigrations = sqliteTable("local_migrations", {
  name: text("name").primaryKey(),
  tag: text("tag").notNull(),
  appliedAt: integer("applied_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// Tables never cross-copied between OPFS DBs (per-DB cursors/queues).
export const LOCAL_ONLY_TABLES = [
  getTableName(localMigrations),
  getTableName(localPendingTasks),
] as const;

// Cursor-row names in local_migrations. migrationVersion holds the last tag.
export const LOCAL_MIGRATION_KEYS = {
  migrationVersion: "migration_version",
} as const;
