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
import type { TokenizerRef } from "@/lib/ai/chat/tokenizer";
import type { UserTheme } from "@/components/ui/theme/theme-store";
import type {
  MessageItemType,
  MessageRole,
  ReasoningEffort,
  WebSearchContextSize,
  WebSearchEngine,
} from "@/lib/validation/chat";
import type { LorebookInjectionRole } from "@/lib/validation/rp";

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

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    title: text("title"),
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalCost: real("total_cost").notNull().default(0),
    defaultModel: text("default_model").notNull(),
    personaId: text("persona_id"),
    presetId: text("preset_id"),
    systemPromptOverride: text("system_prompt_override"),
    authorNote: text("author_note"),
    authorNoteDepth: integer("author_note_depth").notNull().default(4),
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
    vars: text("vars"),
    streamingEnabled: integer("streaming_enabled", { mode: "boolean" }),
    autoScrollStream: integer("auto_scroll_stream", { mode: "boolean" }),
    showReasoning: integer("show_reasoning", { mode: "boolean" }),
    groupOrderByOrder: integer("group_order_by_order", { mode: "boolean" }),
    autoContinue: integer("auto_continue", { mode: "boolean" }),
    summaryMemory: text("summary_memory"),
    summaryAnchor: integer("summary_anchor"),
    memoryEnabled: integer("memory_enabled", { mode: "boolean" }),
    utilityModel: text("utility_model"),
    titleModel: text("title_model"),
    titlePrompt: text("title_prompt"),
    imageEnabled: integer("image_enabled", { mode: "boolean" }),
    promptInstruction: text("prompt_instruction"),
    imageModel: text("image_model"),
    imagePreview: integer("image_preview", { mode: "boolean" }),
    imageRefIds: text("image_ref_ids"),
    useCharAvatarRef: integer("use_char_avatar_ref", { mode: "boolean" }),
    firstMsgIndex: integer("first_msg_index").notNull().default(-1),
    groupId: text("group_id"),
    ...timestamps(),
  },
  (table) => [
    index("idx_conv_updated").on(table.updatedAt),
    index("idx_conv_group").on(table.groupId),
  ],
);

export const chatGroups = sqliteTable(
  "chat_groups",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    folded: integer("folded", { mode: "boolean" }).notNull().default(false),
    ...timestamps(),
  },
  (table) => [index("idx_chat_group_order").on(table.orderIndex)],
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
    branchVars: text("branch_vars"),
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
    data: text("data", { mode: "json" })
      .notNull()
      .$type<Record<string, unknown>>(),
    createdAt: createdAtCol(),
  },
  (table) => [
    index("idx_msgitem_msg_seq").on(table.messageId, table.sequenceIndex),
  ],
);

export const requestLogs = sqliteTable(
  "request_logs",
  {
    msgId: text("msg_id").primaryKey(),
    convId: text("conv_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    requestBody: text("request_body", { mode: "json" }).notNull(),
    assembledSystem: text("assembled_system"),
    finalMessages: text("final_messages", { mode: "json" }).notNull(),
    responseHeaders: text("response_headers", { mode: "json" }),
    // The post-strip wire params (modelParams + providerOptions) exactly as
    // handed to the SDK; the proof that a reasoning-effort setting was sent.
    sent: text("sent", { mode: "json" }),
    droppedParams: text("dropped_params"),
    requestId: text("request_id"),
    url: text("url"),
    endpoint: text("endpoint"),
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

export const characters = sqliteTable(
  "characters",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    name: text("name").notNull(),
    avatarMediaId: text("avatar_media_id"),
    backgroundMediaId: text("background_media_id"),
    description: text("description"),
    personality: text("personality"),
    scenario: text("scenario"),
    firstMessage: text("first_message"),
    alternateGreetings: text("alternate_greetings", {
      mode: "json",
    }).$type<string[]>(),
    exampleMessages: text("example_messages"),
    systemPrompt: text("system_prompt"),
    postHistoryInstructions: text("post_history_instructions"),
    defaultReasoningEffort: text("default_reasoning_effort"),
    tags: text("tags", { mode: "json" }).$type<string[]>(),
    triggers: text("triggers", { mode: "json" }),
    turnTriggers: text("turn_triggers", { mode: "json" }).$type<string[]>(),
    regexScripts: text("regex_scripts", { mode: "json" }),
    assets: text("assets", { mode: "json" }).$type<
      { name: string; mediaId: string }[]
    >(),
    alwaysActive: integer("always_active", { mode: "boolean" })
      .notNull()
      .default(true),
    matchWholeWords: integer("match_whole_words", { mode: "boolean" })
      .notNull()
      .default(false),
    ...timestamps(),
  },
  (table) => [
    index("idx_char_updated").on(table.updatedAt),
    index("idx_char_name").on(table.name),
  ],
);

export const personas = sqliteTable(
  "personas",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    name: text("name").notNull(),
    title: text("title"),
    description: text("description"),
    personality: text("personality"),
    avatarMediaId: text("avatar_media_id"),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => [index("idx_persona_default").on(table.isDefault)],
);

export const lorebooks = sqliteTable("lorebooks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uid()),
  name: text("name").notNull(),
  description: text("description"),
  scanDepth: integer("scan_depth").notNull().default(4),
  tokenBudget: integer("token_budget").notNull().default(1500),
  recursiveScanning: integer("recursive_scanning", { mode: "boolean" })
    .notNull()
    .default(false),
  ...timestamps(),
});

export const lorebookEntries = sqliteTable(
  "lorebook_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    lorebookId: text("lorebook_id")
      .notNull()
      .references(() => lorebooks.id, { onDelete: "cascade" }),
    comment: text("comment"),
    keys: text("keys", { mode: "json" }).notNull().$type<string[]>(),
    secondaryKeys: text("secondary_keys", { mode: "json" }).$type<string[]>(),
    content: text("content").notNull(),
    constant: integer("constant", { mode: "boolean" }).notNull().default(false),
    selective: integer("selective", { mode: "boolean" })
      .notNull()
      .default(false),
    priority: integer("priority").notNull().default(100),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    orderIndex: integer("order_index").notNull().default(0),
    matchWholeWords: integer("match_whole_words", { mode: "boolean" })
      .notNull()
      .default(false),
    injectionRole: text("injection_role")
      .notNull()
      .default("system")
      .$type<LorebookInjectionRole>(),
    chance: integer("chance"),
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
    tokenizer: text("tokenizer").$type<TokenizerRef>(),
    streamingEnabled: integer("streaming_enabled", { mode: "boolean" }),
    autoScrollStream: integer("auto_scroll_stream", { mode: "boolean" }),
    showReasoning: integer("show_reasoning", { mode: "boolean" }),
    reasoningEffort: text("reasoning_effort").$type<ReasoningEffort>(),
    chatMemory: integer("chat_memory"),
    utilityModel: text("utility_model"),
    // Provider lane for the model beside it, shipped as X-Group. Null = auto.
    utilityGroup: text("utility_group"),
    titleModel: text("title_model"),
    titleGroup: text("title_group"),
    titlePrompt: text("title_prompt"),
    memoryEnabled: integer("memory_enabled", { mode: "boolean" }),
    imageEnabled: integer("image_enabled", { mode: "boolean" }),
    promptInstruction: text("prompt_instruction"),
    imageModel: text("image_model"),
    imageGroup: text("image_group"),
    imagePreview: integer("image_preview", { mode: "boolean" }),
    useCharAvatarRef: integer("use_char_avatar_ref", { mode: "boolean" }),
    extraBody: text("extra_body"),
    providers: text("providers"),
    promptTemplate: text("prompt_template"),
    mainPrompt: text("main_prompt"),
    postHistory: text("post_history"),
    postHistoryRole: text("post_history_role"),
    prefill: text("prefill"),
    continuePrompt: text("continue_prompt"),
    impersonatePrompt: text("impersonate_prompt"),
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
    ...timestamps(),
  },
  (table) => [index("idx_preset_name").on(table.name)],
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
    name: text("name").notNull(),
    description: text("description"),
    personaId: text("persona_id"),
    ...timestamps(),
  },
  (table) => [index("idx_card_updated").on(table.updatedAt)],
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

// Theme history, newest row last: the customizer undo walks backwards through
// it. `user_id` is the legacy column name, kept because renaming a primary key
// costs a table rebuild for nothing. It held a single pinned row (id 1) while
// nothing read the table back; it now autoincrements so each save is an entry.
export const userThemes = sqliteTable(
  "user_themes",
  {
    id: integer("user_id").primaryKey({ autoIncrement: true }),
    themeJson: text("theme_json", { mode: "json" })
      .$type<UserTheme>()
      .notNull(),
    ...timestamps(),
  },
  (table) => [index("idx_user_themes_created").on(table.createdAt)],
);

export const media = sqliteTable(
  "media",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    convId: text("conv_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    // `playground_id` is the legacy column name kept for compatibility.
    imageSnapshotId: text("playground_id"),
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
    promptText: text("prompt_text"),
    seed: integer("seed"),
    createdAt: createdAtCol(),
  },
  (table) => [index("idx_media_conv").on(table.convId)],
);
export type Media = typeof media.$inferSelect;
