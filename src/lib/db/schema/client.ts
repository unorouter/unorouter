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
    // Tokenizer is per-model now (rides each CustomProviderModel in the models json), not a provider column.
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

// NOTE: the tester tables (provider/model/test/probe) moved to schema/shared.ts
// as ONE definition for both the client (private history) and server (public
// board). See the comment there. Import them from "./shared", not here.

// Downloaded tokenizer cache (OPFS). Tokenizer files (HF tokenizer.json + tokenizer_config.json) are fetched
// on demand for per-model token budgeting and cached here so a reload doesn't re-download. NOT user-scoped:
// tokenizer files are public + identical across users, keyed by their canonical `source` (HF slug or URL).
export const tokenizers = sqliteTable("tokenizers", {
  // Canonical source key: an HF slug ("owner/repo"), a direct tokenizer.json URL, or a built-in id ("cl100k").
  source: text("source").primaryKey(),
  // Display name (built-in label or derived from the slug).
  name: text("name").notNull(),
  // Loader family: "tiktoken" (gpt-tokenizer cl100k/o200k), "huggingface" (@lenml tokenizer.json), "approximate".
  type: text("type").$type<TokenizerKind>().notNull(),
  // HF tokenizer.json contents (JSON string). Null for built-in/package tokenizers that need no download.
  tokenizerJson: text("tokenizer_json"),
  // Optional HF tokenizer_config.json contents (JSON string).
  tokenizerConfig: text("tokenizer_config"),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// Per-device migration cursor: one row tracks the last applied migration tag.
export const localMigrations = sqliteTable("local_migrations", {
  name: text("name").primaryKey(),
  tag: text("tag").notNull(),
  appliedAt: integer("applied_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// Tables never cross-copied between OPFS DBs (per-DB cursors/queues + the re-downloadable tokenizer cache).
export const LOCAL_ONLY_TABLES = [
  getTableName(localMigrations),
  getTableName(localPendingTasks),
  getTableName(tokenizers),
] as const;

// Cursor-row names in local_migrations. migrationVersion holds the last tag.
export const LOCAL_MIGRATION_KEYS = {
  migrationVersion: "migration_version",
} as const;
