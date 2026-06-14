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

    // Deferred work drained on load with backoff. logEnrich (only task type today) pulls a request's authoritative cost/tokens/channel after the stream settled.
export type PendingTaskType = "logEnrich";

    // Outbox: deferred work drained with backoff. Task args ride the payload JSON; kind scopes future per-entity task types.
export const localPendingTasks = sqliteTable(
  "local_pending_tasks",
  {
    // Task variant; selects the drain handler.
    taskType: text("task_type")
      .notNull()
      .default("logEnrich")
      .$type<PendingTaskType>(),
        // Per-entity scope where needed. logEnrich stores "" (PK members can't be null); the queue maps "" and null at its boundary.
    kind: text("kind").notNull().$type<SyncKindName | "">(),
    // Entity id: msgId for logEnrich (convId/etc. for future task types).
    id: text("id").notNull(),
    op: text("op").notNull().$type<PendingSyncOp>(),
    queuedAt: integer("queued_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    attempts: integer("attempts").notNull().default(0),
    // Backoff: drain skips rows where nextAttemptAt > now. Null = drain now.
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    // Per-task JSON args. logEnrich: {requestId}.
    payload: text("payload"),
        // Bumped on every enqueue; drain deletes only when seq is unchanged, so a mid-drain enqueue survives for the next pass.
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
