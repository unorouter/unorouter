import type {
  CustomProviderFormat,
  CustomProviderModel,
} from "@/lib/validation/custom-provider";
import type { TokenizerKind } from "@/lib/ai/chat/tokenizer";
import type {
  GenerationFormUi,
  GenerationParams,
  GenerationStatus,
  LoraEntry,
  PlaygroundVisibility,
  ReferenceEntry,
} from "@/lib/validation/playground";
import { uid } from "@/lib/utils/base";
import { getTableName, sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { timestamps } from "./shared";

export const ENTITY_KINDS = [
  "characters",
  "personas",
  "lorebooks",
  "presets",
  "cards",
  "conversations",
  "theme",
] as const;

export type EntityKindName = (typeof ENTITY_KINDS)[number];

export type RpEntityKind = Exclude<EntityKindName, "theme">;

export type PendingSyncOp = "patch" | "delete";

export type PendingTaskType = "logEnrich";

export const localPendingTasks = sqliteTable(
  "local_pending_tasks",
  {
    taskType: text("task_type")
      .notNull()
      .default("logEnrich")
      .$type<PendingTaskType>(),
    kind: text("kind").notNull().$type<EntityKindName | "">(),
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
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("idx_custom_providers_user").on(table.userId)],
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

// Checkpoints the user brought themselves, addressed by AIR. Saved on first successful
// generation rather than on resolve, so the list is models actually used and not every one
// glanced at. Client only, like custom_providers: nothing here belongs on a server.
export const imageModels = sqliteTable(
  "image_models",
  {
    air: text("air").primaryKey(),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    architecture: text("architecture"),
    heroImage: text("hero_image"),
    nsfwLevel: integer("nsfw_level"),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_image_models_user").on(table.userId, table.lastUsedAt),
  ],
);

export type ImageModel = typeof imageModels.$inferSelect;

// A saved generation setup: everything the form holds except the prompt, which is the one
// part that changes every time. Mirrors the snapshot columns rather than a column per knob,
// since the params are already one validated JSON blob and a new knob would otherwise mean
// a migration. Client only: a generation setup is a local preference, not account state.
export const imagePresets = sqliteTable(
  "image_presets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    model: text("model").notNull(),
    negativePrompt: text("negative_prompt"),
    params: text("params", { mode: "json" }).$type<GenerationParams>(),
    loras: text("loras", { mode: "json" }).$type<LoraEntry[]>(),
    extraParams: text("extra_params", { mode: "json" }).$type<GenerationFormUi>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("idx_image_presets_user").on(table.userId, table.name)],
);

export type ImagePreset = typeof imagePresets.$inferSelect;

export const imageSessions = sqliteTable(
  "image_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    title: text("title"),
    firstModel: text("first_model"),
    snapshotCount: integer("snapshot_count").notNull().default(0),
    imageCount: integer("image_count").notNull().default(0),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("idx_image_session_user_updated").on(table.userId, table.updatedAt),
    index("idx_image_session_expires").on(table.expiresAt),
  ],
);

// One generation within a session. Each row carries its FULL param set, which is what
// makes navigating back to it able to restore the form exactly as it was.
export const imageSnapshots = sqliteTable(
  "image_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    sessionId: text("session_id")
      .notNull()
      .references(() => imageSessions.id, { onDelete: "cascade" }),
    sessionOrder: integer("session_order").notNull(),
    // Which snapshot this one was generated from. A session is an ordered list, so
    // without this a branch off an older snapshot appends at the end and the fork is
    // invisible. Null for the first snapshot of a session.
    parentSnapshotId: text("parent_snapshot_id").references(
      (): AnySQLiteColumn => imageSnapshots.id,
      { onDelete: "set null" },
    ),
    requestedCount: integer("requested_count").notNull().default(1),
    taskId: text("task_id"),
    model: text("model").notNull(),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    params: text("params", { mode: "json" }).$type<GenerationParams>(),
    loras: text("loras", { mode: "json" }).$type<LoraEntry[]>(),
    references: text("references", { mode: "json" }).$type<ReferenceEntry[]>(),
    extraParams: text("extra_params", {
      mode: "json",
    }).$type<GenerationFormUi>(),
    status: text("status")
      .notNull()
      .default("pending")
      .$type<GenerationStatus>(),
    progress: text("progress"),
    costQuota: integer("cost_quota"),
    visibility: text("visibility")
      .notNull()
      .default("private")
      .$type<PlaygroundVisibility>(),
    flagged: integer("flagged", { mode: "boolean" }).notNull().default(false),
    flagReason: text("flag_reason"),
    errorMessage: text("error_message"),
    // Set before submitting so a double-click cannot bill the same generation twice.
    submittedKey: text("submitted_key"),
    ...timestamps(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_image_snapshot_session").on(table.sessionId, table.sessionOrder),
    index("idx_image_snapshot_user").on(table.userId),
    index("idx_image_snapshot_expires").on(table.expiresAt),
    uniqueIndex("idx_image_snapshot_submitted").on(table.submittedKey),
  ],
);

export type ImageSession = typeof imageSessions.$inferSelect;
export type ImageSnapshot = typeof imageSnapshots.$inferSelect;
