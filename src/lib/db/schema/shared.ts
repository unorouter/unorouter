import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { uid } from "@/lib/utils/base";
import type { UserTheme } from "@/components/ui/theme/theme-store";

// `syncExpiresAt`: null = local-only (no Turso copy); non-null = synced,
// server-purged after the timestamp.

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    title: text("title"),
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalCost: real("total_cost").notNull().default(0),
    syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_conv_user_updated").on(table.userId, table.updatedAt),
    index("idx_conv_sync_expires").on(table.syncExpiresAt),
  ],
);

export const conversationSettings = sqliteTable("conversation_settings", {
  convId: text("conv_id")
    .primaryKey()
    .references(() => conversations.id, { onDelete: "cascade" }),
  defaultModel: text("default_model").notNull(),
  personaId: text("persona_id"),
  presetId: text("preset_id"),
  systemPromptOverride: text("system_prompt_override"),
  authorNote: text("author_note"),
  authorNoteDepth: integer("author_note_depth").notNull().default(4),
  chatMemory: integer("chat_memory").notNull().default(8),
  reasoningEffort: text("reasoning_effort"),
  webSearchEnabled: integer("web_search_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  webSearchEngine: text("web_search_engine").notNull().default("auto"),
  webSearchContextSize: text("web_search_context_size")
    .notNull()
    .default("medium"),
  temperature: real("temperature"),
  topP: real("top_p"),
  topK: integer("top_k"),
  minP: real("min_p"),
  topA: real("top_a"),
  frequencyPenalty: real("frequency_penalty"),
  presencePenalty: real("presence_penalty"),
  repetitionPenalty: real("repetition_penalty"),
  maxTokens: integer("max_tokens"),
  extraBody: text("extra_body"),
  streamingEnabled: integer("streaming_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    convId: text("conv_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    characterId: text("character_id"),
    role: text("role").notNull(),
    model: text("model"),
    playgroundId: text("playground_id"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cost: real("cost"),
    durationMs: integer("duration_ms"),
    tokensPerSecond: real("tokens_per_second"),
    branchIndex: integer("branch_index").notNull().default(0),
    isActiveBranch: integer("is_active_branch", { mode: "boolean" })
      .notNull()
      .default(true),
    isEdited: integer("is_edited", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_msg_conv_parent").on(table.convId, table.parentId),
    index("idx_msg_conv_created").on(table.convId, table.createdAt),
    index("idx_msg_parent_branch").on(table.parentId, table.branchIndex),
  ],
);

export const messageItems = sqliteTable(
  "message_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    sequenceIndex: integer("sequence_index").notNull(),
    outputIndex: integer("output_index"),
    type: text("type").notNull(),
    data: text("data", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_msgitem_msg_seq").on(table.messageId, table.sequenceIndex),
  ],
);

// SillyTavern-compatible.
export const characters = sqliteTable(
  "characters",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    // FK to `media` row holding the avatar bytes/pointer. See media table
    // for the asymmetric local-base64 / R2 sync rule.
    avatarMediaId: text("avatar_media_id"),
    description: text("description"),
    personality: text("personality"),
    scenario: text("scenario"),
    firstMessage: text("first_message"),
    exampleMessages: text("example_messages"),
    systemPrompt: text("system_prompt"),
    postHistoryInstructions: text("post_history_instructions"),
    defaultReasoningEffort: text("default_reasoning_effort"),
    tags: text("tags", { mode: "json" }),
    triggers: text("triggers", { mode: "json" }),
    alwaysActive: integer("always_active", { mode: "boolean" })
      .notNull()
      .default(true),
    matchWholeWords: integer("match_whole_words", { mode: "boolean" })
      .notNull()
      .default(false),
    syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_char_user_updated").on(table.userId, table.updatedAt),
    index("idx_char_user_name").on(table.userId, table.name),
    index("idx_char_sync_expires").on(table.syncExpiresAt),
  ],
);

export const personas = sqliteTable(
  "personas",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    // FK to `media` row holding the avatar bytes/pointer. See media table
    // for the asymmetric local-base64 / R2 sync rule.
    avatarMediaId: text("avatar_media_id"),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    notes: text("notes"),
    syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_persona_user_default").on(table.userId, table.isDefault),
    index("idx_persona_user").on(table.userId),
    index("idx_persona_sync_expires").on(table.syncExpiresAt),
  ],
);

export const lorebooks = sqliteTable(
  "lorebooks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    scanDepth: integer("scan_depth").notNull().default(4),
    tokenBudget: integer("token_budget").notNull().default(1500),
    recursiveScanning: integer("recursive_scanning", { mode: "boolean" })
      .notNull()
      .default(false),
    syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_lorebook_user").on(table.userId),
    index("idx_lorebook_sync_expires").on(table.syncExpiresAt),
  ],
);

export const lorebookEntries = sqliteTable(
  "lorebook_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    lorebookId: text("lorebook_id")
      .notNull()
      .references(() => lorebooks.id, { onDelete: "cascade" }),
    keys: text("keys", { mode: "json" }).notNull(),
    secondaryKeys: text("secondary_keys", { mode: "json" }),
    content: text("content").notNull(),
    constant: integer("constant", { mode: "boolean" }).notNull().default(false),
    selective: integer("selective", { mode: "boolean" })
      .notNull()
      .default(false),
    priority: integer("priority").notNull().default(100),
    position: text("position").notNull().default("before_char"),
    depth: integer("depth").notNull().default(4),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    orderIndex: integer("order_index").notNull().default(0),
    matchWholeWords: integer("match_whole_words", { mode: "boolean" })
      .notNull()
      .default(false),
    injectionRole: text("injection_role").notNull().default("user"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_lbentry_book_enabled").on(table.lorebookId, table.enabled),
  ],
);

export const samplingPresets = sqliteTable(
  "sampling_presets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    temperature: real("temperature"),
    topP: real("top_p"),
    topK: integer("top_k"),
    minP: real("min_p"),
    topA: real("top_a"),
    frequencyPenalty: real("frequency_penalty"),
    presencePenalty: real("presence_penalty"),
    repetitionPenalty: real("repetition_penalty"),
    maxTokens: integer("max_tokens"),
    extraBody: text("extra_body"),
    mainPrompt: text("main_prompt"),
    postHistory: text("post_history"),
    prefill: text("prefill"),
    forceAlternateRoles: integer("force_alternate_roles", { mode: "boolean" })
      .notNull()
      .default(false),
    noSystemRole: integer("no_system_role", { mode: "boolean" })
      .notNull()
      .default(false),
    mustStartWithUserInput: integer("must_start_with_user_input", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    skipPrefillIfLastIsAssistant: integer("skip_prefill_if_last_is_assistant", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    geminiBlockOff: integer("gemini_block_off", { mode: "boolean" })
      .notNull()
      .default(false),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_preset_user_name").on(table.userId, table.name),
    index("idx_preset_sync_expires").on(table.syncExpiresAt),
  ],
);

export const conversationCharacters = sqliteTable(
  "conversation_characters",
  {
    convId: text("conv_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    overrides: text("overrides", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    primaryKey({ columns: [table.convId, table.characterId] }),
    index("idx_convchar_conv_order").on(table.convId, table.orderIndex),
  ],
);

export const conversationLorebooks = sqliteTable(
  "conversation_lorebooks",
  {
    convId: text("conv_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    lorebookId: text("lorebook_id")
      .notNull()
      .references(() => lorebooks.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    primaryKey({ columns: [table.convId, table.lorebookId] }),
    index("idx_convlb_conv_order").on(table.convId, table.orderIndex),
  ],
);

export const cards = sqliteTable(
  "cards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    personaId: text("persona_id"),
    syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_card_user_updated").on(table.userId, table.updatedAt),
    index("idx_card_sync_expires").on(table.syncExpiresAt),
  ],
);

export const cardCharacters = sqliteTable(
  "card_characters",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.cardId, table.characterId] }),
    index("idx_cardchar_card_order").on(table.cardId, table.orderIndex),
  ],
);

export const cardLorebooks = sqliteTable(
  "card_lorebooks",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    lorebookId: text("lorebook_id")
      .notNull()
      .references(() => lorebooks.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.cardId, table.lorebookId] }),
    index("idx_cardlb_card_order").on(table.cardId, table.orderIndex),
  ],
);

// One row per user (PK on userId).
export const userThemes = sqliteTable(
  "user_themes",
  {
    userId: integer("user_id").primaryKey(),
    themeJson: text("theme_json", { mode: "json" })
      .$type<UserTheme>()
      .notNull(),
    syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("idx_theme_sync_expires").on(table.syncExpiresAt)],
);

// Generic blob store. Referenced by conversation messages, RP avatars, etc.
// Asymmetric sync rule: client writes data_base64 -> server uploads to R2 +
// fills r2_key/r2_url -> Turso never stores bytes. Rehydrator fetches R2 ->
// data_base64 on first read, never overwrites an existing local cache.
export const media = sqliteTable(
  "media",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    // Optional back-reference. Conversation messages set convId so deletes
    // cascade. Avatars + other top-level media leave it null.
    convId: text("conv_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    r2Key: text("r2_key"),
    r2Url: text("r2_url"),
    dataBase64: text("data_base64"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    extractedText: text("extracted_text"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_media_user").on(table.userId),
    index("idx_media_conv").on(table.convId),
  ],
);

export const playgroundSessions = sqliteTable(
  "playground_sessions",
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
    syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_session_user_updated").on(table.userId, table.updatedAt),
    index("idx_session_expires").on(table.expiresAt),
    index("idx_session_sync_expires").on(table.syncExpiresAt),
  ],
);

export const playgrounds = sqliteTable(
  "playgrounds",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    sessionId: text("session_id")
      .notNull()
      .references(() => playgroundSessions.id, { onDelete: "cascade" }),
    sessionOrder: integer("session_order").notNull(),
    requestedCount: integer("requested_count").notNull().default(1),
    taskId: text("task_id"),
    model: text("model").notNull(),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    params: text("params", { mode: "json" }),
    loras: text("loras", { mode: "json" }),
    references: text("references", { mode: "json" }),
    extraParams: text("extra_params", { mode: "json" }),
    status: text("status").notNull().default("pending"),
    progress: text("progress"),
    costQuota: integer("cost_quota"),
    visibility: text("visibility").notNull().default("private"),
    flagged: integer("flagged", { mode: "boolean" }).notNull().default(false),
    flagReason: text("flag_reason"),
    remixCount: integer("remix_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    remixedFrom: text("remixed_from"),
    errorMessage: text("error_message"),
    submittedKey: text("submitted_key"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_gen_session_order").on(table.sessionId, table.sessionOrder),
    index("idx_gen_visibility_created").on(table.visibility, table.createdAt),
    index("idx_gen_model_created").on(table.model, table.createdAt),
    index("idx_gen_task").on(table.taskId),
    index("idx_gen_remixed_from").on(table.remixedFrom),
    index("idx_gen_expires").on(table.expiresAt),
  ],
);

export const playgroundImages = sqliteTable(
  "playground_images",
  {
    playgroundId: text("playground_id")
      .notNull()
      .references(() => playgrounds.id, { onDelete: "cascade" }),
    sequenceIndex: integer("sequence_index").notNull(),
    upstreamResultUrl: text("upstream_result_url"),
    r2Url: text("r2_url").notNull(),
    r2Key: text("r2_key").notNull(),
    mimeType: text("mime_type").default("image/png"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    primaryKey({ columns: [table.playgroundId, table.sequenceIndex] }),
    index("idx_genimg_generation_id").on(table.playgroundId),
  ],
);

export const playgroundLikes = sqliteTable(
  "playground_likes",
  {
    playgroundId: text("playground_id")
      .notNull()
      .references(() => playgrounds.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    primaryKey({ columns: [table.playgroundId, table.userId] }),
    index("idx_likes_user").on(table.userId),
  ],
);

export type Message = typeof messages.$inferSelect;
export type MessageItem = typeof messageItems.$inferSelect;
export type PlaygroundSession = typeof playgroundSessions.$inferSelect;
export type Playground = typeof playgrounds.$inferSelect;
export type PlaygroundImage = typeof playgroundImages.$inferSelect;
export type PlaygroundLike = typeof playgroundLikes.$inferSelect;
