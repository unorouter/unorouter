import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { uid } from "@/lib/utils/base";
import type { UserTheme } from "@/components/ui/theme/theme-store";
import type {
  MessageItemType,
  MessageRole,
  ReasoningEffort,
  WebSearchContextSize,
  WebSearchEngine,
} from "@/lib/validation/chat";
import type {
  LorebookEntryPosition,
  LorebookInjectionRole,
} from "@/lib/validation/rp";
import type {
  GenerationFormUi,
  GenerationParams,
  GenerationStatus,
  LoraEntry,
  PlaygroundVisibility,
  ReferenceEntry,
} from "@/lib/validation/playground";

// syncExpiresAt: null=local-only; non-null=synced + server-purged past timestamp.

    // Fresh builder per call: drizzle binds a builder to its table, so shared column shapes must be factories, not constants.
export const createdAtCol = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const timestamps = () => ({
  createdAt: createdAtCol(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

const syncableTimestamps = () => ({
  syncExpiresAt: integer("sync_expires_at", { mode: "timestamp_ms" }),
  ...timestamps(),
});

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    title: text("title"),
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalCost: real("total_cost").notNull().default(0),
    // Per-conversation settings (formerly conversation_settings table).
    defaultModel: text("default_model").notNull(),
    personaId: text("persona_id"),
    presetId: text("preset_id"),
    systemPromptOverride: text("system_prompt_override"),
    authorNote: text("author_note"),
    authorNoteDepth: integer("author_note_depth").notNull().default(4),
    // null = inherit the bound preset's chatMemory (else default 8).
    chatMemory: integer("chat_memory"),
    reasoningEffort: text("reasoning_effort").$type<ReasoningEffort>(),
    webSearchEnabled: integer("web_search_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    webSearchEngine: text("web_search_engine")
      .notNull()
      .default("auto")
      .$type<WebSearchEngine>(),
    webSearchContextSize: text("web_search_context_size")
      .notNull()
      .default("medium")
      .$type<WebSearchContextSize>(),
    // Billing/routing group sent upstream as X-Group; null = auto (gateway default).
    group: text("group"),
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
    // Chat-variable store (RisuAI getvar/setvar): JSON map { name: value }.
    vars: text("vars"),
    // null = inherit the bound preset's streamingEnabled (else default true).
    streamingEnabled: integer("streaming_enabled", { mode: "boolean" }),
        // Multi-character turn ordering: deterministic stored order vs name-mention + talkness.
    groupOrderByOrder: integer("group_order_by_order", { mode: "boolean" }),
    autoContinue: integer("auto_continue", { mode: "boolean" }),
        // Rolling-summary memory: the running summary + the count of messages folded into it (anchor), replacing older history once it overflows.
    summaryMemory: text("summary_memory"),
    summaryAnchor: integer("summary_anchor"),
    // Toggle for the rolling summary + semantic retrieval memory features.
    memoryEnabled: integer("memory_enabled", { mode: "boolean" }),
        // RisuAI fmIndex: which greeting opens the chat (-1 = firstMessage, 0..n = alternateGreetings index).
    firstMsgIndex: integer("first_msg_index").notNull().default(-1),
    ...syncableTimestamps(),
  },
  (table) => [
    index("idx_conv_user_updated").on(table.userId, table.updatedAt),
    index("idx_conv_sync_expires").on(table.syncExpiresAt),
  ],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    convId: text("conv_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnySQLiteColumn => messages.id, {
      onDelete: "set null",
    }),
    characterId: text("character_id"),
    role: text("role").notNull().$type<MessageRole>(),
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
    ...timestamps(),
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
    type: text("type").notNull().$type<MessageItemType>(),
    data: text("data", { mode: "json" }).notNull(),
    createdAt: createdAtCol(),
  },
  (table) => [
    index("idx_msgitem_msg_seq").on(table.messageId, table.sequenceIndex),
  ],
);

// One row per assistant msg: request, system prompt, messages, headers, usage. Cascades; PK=msgId.
export const requestLogs = sqliteTable(
  "request_logs",
  {
        // No FK to messages: the server writes this at stream finish, before the client pushes the message row. convId cascade covers cleanup.
    msgId: text("msg_id").primaryKey(),
    convId: text("conv_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    requestBody: text("request_body", { mode: "json" }).notNull(),
    assembledSystem: text("assembled_system"),
    finalMessages: text("final_messages", { mode: "json" }).notNull(),
    responseHeaders: text("response_headers", { mode: "json" }),
    droppedParams: text("dropped_params"),
    requestId: text("request_id"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cost: real("cost"),
    durationMs: integer("duration_ms"),
    tokensPerSecond: real("tokens_per_second"),
    channelName: text("channel_name"),
    createdAt: createdAtCol(),
  },
  (table) => [
    index("idx_reqlog_conv").on(table.convId),
    index("idx_reqlog_created").on(table.createdAt),
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
    // FK to media (asymmetric base64/R2 rule).
    avatarMediaId: text("avatar_media_id"),
    // FK to media; rendered behind the chat when this character is primary.
    backgroundMediaId: text("background_media_id"),
    description: text("description"),
    personality: text("personality"),
    scenario: text("scenario"),
    firstMessage: text("first_message"),
    // Card-spec alternate_greetings; conversation firstMsgIndex picks one.
    alternateGreetings: text("alternate_greetings", {
      mode: "json",
    }).$type<string[]>(),
    exampleMessages: text("example_messages"),
    systemPrompt: text("system_prompt"),
    postHistoryInstructions: text("post_history_instructions"),
    defaultReasoningEffort: text("default_reasoning_effort"),
    tags: text("tags", { mode: "json" }).$type<string[]>(),
        // RisuAI triggerscript[] (V2 effect VM). Keyword turn-gating moved to turn_triggers, so this column carries the trigger programs.
    triggers: text("triggers", { mode: "json" }),
    // Keyword array for multi-character turn-gating (non-primary chars).
    turnTriggers: text("turn_triggers", { mode: "json" }).$type<string[]>(),
    // RisuAI customscript / SillyTavern regex scripts (in/out/type/flag array).
    regexScripts: text("regex_scripts", { mode: "json" }),
    alwaysActive: integer("always_active", { mode: "boolean" })
      .notNull()
      .default(true),
    matchWholeWords: integer("match_whole_words", { mode: "boolean" })
      .notNull()
      .default(false),
    ...syncableTimestamps(),
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
    // FK to media (asymmetric base64/R2 rule).
    avatarMediaId: text("avatar_media_id"),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    notes: text("notes"),
    ...syncableTimestamps(),
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
    ...syncableTimestamps(),
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
    keys: text("keys", { mode: "json" }).notNull().$type<string[]>(),
    secondaryKeys: text("secondary_keys", { mode: "json" }).$type<string[]>(),
    content: text("content").notNull(),
    constant: integer("constant", { mode: "boolean" }).notNull().default(false),
    selective: integer("selective", { mode: "boolean" })
      .notNull()
      .default(false),
    priority: integer("priority").notNull().default(100),
    position: text("position")
      .notNull()
      .default("before_char")
      .$type<LorebookEntryPosition>(),
    depth: integer("depth").notNull().default(4),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    orderIndex: integer("order_index").notNull().default(0),
    matchWholeWords: integer("match_whole_words", { mode: "boolean" })
      .notNull()
      .default(false),
    injectionRole: text("injection_role")
      .notNull()
      .default("system")
      .$type<LorebookInjectionRole>(),
    ...timestamps(),
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
        // Preset-level defaults; the conversation's own value overrides per chat. null is the system default.
    streamingEnabled: integer("streaming_enabled", { mode: "boolean" }),
    chatMemory: integer("chat_memory"),
    extraBody: text("extra_body"),
    providers: text("providers"),
    promptTemplate: text("prompt_template"),
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
    geminiBlockOff: integer("gemini_block_off", { mode: "boolean" })
      .notNull()
      .default(false),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    ...syncableTimestamps(),
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
    // [0,1] talkativeness weight for non-mentioned group turn ordering.
    talkness: real("talkness"),
    overrides: text("overrides", { mode: "json" }),
    createdAt: createdAtCol(),
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
    createdAt: createdAtCol(),
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
    ...syncableTimestamps(),
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
    ...syncableTimestamps(),
  },
  (table) => [index("idx_theme_sync_expires").on(table.syncExpiresAt)],
);

    // Generic blob store. Asymmetric: client base64, server R2 upload, Turso pointer-only. Rehydrator never overwrites local cache.
export const media = sqliteTable(
  "media",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    // convId set for chat messages (cascade). Avatars + top-level media leave null.
    convId: text("conv_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    // playgroundId/batchPos/upstreamUrl set for gen images.
    playgroundId: text("playground_id").references(() => playgrounds.id, {
      onDelete: "cascade",
    }),
    sequenceIndex: integer("sequence_index"),
    upstreamResultUrl: text("upstream_result_url"),
    r2Key: text("r2_key"),
    r2Url: text("r2_url"),
    dataBase64: text("data_base64"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    extractedText: text("extracted_text"),
    createdAt: createdAtCol(),
  },
  (table) => [
    index("idx_media_user").on(table.userId),
    index("idx_media_conv").on(table.convId),
    index("idx_media_playground").on(table.playgroundId),
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
    ...syncableTimestamps(),
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
    remixCount: integer("remix_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    remixedFrom: text("remixed_from"),
    errorMessage: text("error_message"),
    submittedKey: text("submitted_key"),
    ...timestamps(),
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

export type Message = typeof messages.$inferSelect;
export type MessageItem = typeof messageItems.$inferSelect;
export type Media = typeof media.$inferSelect;
export type PlaygroundSession = typeof playgroundSessions.$inferSelect;
export type Playground = typeof playgrounds.$inferSelect;
