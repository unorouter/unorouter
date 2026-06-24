import type { SyncKindName } from "@/lib/validation/sync-constants";
import type {
  CustomProviderFormat,
  CustomProviderModel,
  CustomProviderTokenizer,
} from "@/lib/validation/custom-provider";
import { uid } from "@/lib/utils/base";
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

// Deferred work drained on load with backoff. logEnrich (only task type today) pulls a request's authoritative cost/tokens/channel.
export type PendingTaskType = "logEnrich";

// Outbox: deferred work drained with backoff. Task args ride payload JSON; kind scopes future per-entity task types.
export const localPendingTasks = sqliteTable(
  "local_pending_tasks",
  {
    // Task variant; selects the drain handler.
    taskType: text("task_type")
      .notNull()
      .default("logEnrich")
      .$type<PendingTaskType>(),
    // Per-entity scope where needed. logEnrich stores "" (PK members can't be null); the queue maps "" and null at the boundary.
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
    // Bumped on every enqueue; drain deletes only when seq is unchanged, so a mid-drain enqueue survives to next pass.
    seq: integer("seq").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.taskType, table.kind, table.id] }),
    index("idx_pending_queued").on(table.queuedAt),
  ],
);

// Bring-your-own OpenAI-compatible providers (Risu customModels analog). CLIENT-ONLY: no server route,
// never written to Turso. apiKey stored plaintext (local OPFS, only sent to the user's own endpoint).
// Kept OUT of LOCAL_ONLY_TABLES so it survives cross-DB copy/salvage like other user data.
export const customProviders = sqliteTable(
  "custom_providers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    baseUrl: text("base_url").notNull(),
    apiKey: text("api_key").notNull().default(""),
    format: text("format").$type<CustomProviderFormat>().notNull(),
    tokenizer: text("tokenizer").$type<CustomProviderTokenizer>().notNull(),
    models: text("models", { mode: "json" })
      .$type<CustomProviderModel[]>()
      .notNull(),
    syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_custom_providers_user").on(table.userId),
    index("idx_custom_providers_sync_expires").on(table.syncExpiresAt),
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
