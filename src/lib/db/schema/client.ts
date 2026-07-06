import type { SyncKindName } from "@/lib/validation/sync-constants";
import type {
  CustomProviderFormat,
  CustomProviderModel,
} from "@/lib/validation/custom-provider";
import type { TokenizerKind } from "@/lib/ai/chat/tokenizer";
import { uid } from "@/lib/utils/base";
import { getTableName, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export type PendingSyncOp = "patch" | "delete";

export type PendingTaskType = "logEnrich";

export const localPendingTasks = sqliteTable(
  "local_pending_tasks",
  {
    taskType: text("task_type")
      .notNull()
      .default("logEnrich")
      .$type<PendingTaskType>(),
    kind: text("kind").notNull().$type<SyncKindName | "">(),
    id: text("id").notNull(),
    op: text("op").notNull().$type<PendingSyncOp>(),
    queuedAt: integer("queued_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    payload: text("payload"),
    seq: integer("seq").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.taskType, table.kind, table.id] }),
    index("idx_pending_queued").on(table.queuedAt),
  ],
);

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

export const tokenizers = sqliteTable("tokenizers", {
  source: text("source").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<TokenizerKind>().notNull(),
  tokenizerJson: text("tokenizer_json"),
  tokenizerConfig: text("tokenizer_config"),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const localMigrations = sqliteTable("local_migrations", {
  name: text("name").primaryKey(),
  tag: text("tag").notNull(),
  appliedAt: integer("applied_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const LOCAL_ONLY_TABLES = [
  getTableName(localMigrations),
  getTableName(localPendingTasks),
  getTableName(tokenizers),
] as const;

export const LOCAL_MIGRATION_KEYS = {
  migrationVersion: "migration_version",
} as const;
