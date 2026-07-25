import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { uid } from "@/lib/utils/base";
import type {
  VerifyProviderValue,
  VerifyVerdictValue,
} from "@/lib/validation/model-tester";
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
    userId: integer("user_id").notNull(),
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
    index("idx_conv_user_updated").on(table.userId, table.updatedAt),
    index("idx_conv_user_group").on(table.userId, table.groupId),
  ],
);

export const chatGroups = sqliteTable(
  "chat_groups",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    folded: integer("folded", { mode: "boolean" }).notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    index("idx_chat_group_user_order").on(table.userId, table.orderIndex),
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
    data: text("data", { mode: "json" }).notNull(),
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
    userId: integer("user_id").notNull(),
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
    // RisuAI-style named image assets, rendered inline via {{img::name}} at
    // display time (see img-render.ts). Bytes live in the media table.
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
    index("idx_char_user_updated").on(table.userId, table.updatedAt),
    index("idx_char_user_name").on(table.userId, table.name),
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
    title: text("title"),
    description: text("description"),
    avatarMediaId: text("avatar_media_id"),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => [
    index("idx_persona_user_default").on(table.userId, table.isDefault),
    index("idx_persona_user").on(table.userId),
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
    ...timestamps(),
  },
  (table) => [index("idx_lorebook_user").on(table.userId)],
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
    streamingEnabled: integer("streaming_enabled", { mode: "boolean" }),
    autoScrollStream: integer("auto_scroll_stream", { mode: "boolean" }),
    showReasoning: integer("show_reasoning", { mode: "boolean" }),
    chatMemory: integer("chat_memory"),
    utilityModel: text("utility_model"),
    memoryEnabled: integer("memory_enabled", { mode: "boolean" }),
    imageEnabled: integer("image_enabled", { mode: "boolean" }),
    promptInstruction: text("prompt_instruction"),
    imageModel: text("image_model"),
    imagePreview: integer("image_preview", { mode: "boolean" }),
    useCharAvatarRef: integer("use_char_avatar_ref", { mode: "boolean" }),
    extraBody: text("extra_body"),
    providers: text("providers"),
    promptTemplate: text("prompt_template"),
    mainPrompt: text("main_prompt"),
    postHistory: text("post_history"),
    postHistoryRole: text("post_history_role"),
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
    ...timestamps(),
  },
  (table) => [index("idx_preset_user_name").on(table.userId, table.name)],
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
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    personaId: text("persona_id"),
    ...timestamps(),
  },
  (table) => [index("idx_card_user_updated").on(table.userId, table.updatedAt)],
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

export const userThemes = sqliteTable("user_themes", {
  userId: integer("user_id").primaryKey(),
  themeJson: text("theme_json", { mode: "json" }).$type<UserTheme>().notNull(),
  ...timestamps(),
});

export const media = sqliteTable(
  "media",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    convId: text("conv_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    // Dead column: the playgrounds table was removed with the playground feature.
    // Kept nullable (no FK) so the shared media table needs no client migration.
    playgroundId: text("playground_id"),
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
    createdAt: createdAtCol(),
  },
  (table) => [
    index("idx_media_user").on(table.userId),
    index("idx_media_conv").on(table.convId),
  ],
);

export type Message = typeof messages.$inferSelect;
export type MessageItem = typeof messageItems.$inferSelect;
export type Media = typeof media.$inferSelect;

export const testerProviders = sqliteTable(
  "tester_providers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    kind: text("kind").$type<VerifyProviderValue>().notNull(),
    baseUrlHost: text("base_url_host").notNull(),
    label: text("label"),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull(),
    lastTestedAt: integer("last_tested_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("uq_tester_provider").on(
      table.userId,
      table.kind,
      table.baseUrlHost,
    ),
  ],
);

export const testerModels = sqliteTable(
  "tester_models",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    providerId: text("provider_id")
      .notNull()
      .references(() => testerProviders.id, { onDelete: "cascade" }),
    requestedModel: text("requested_model").notNull(),
    lastDetectedModel: text("last_detected_model"),
    lastVerdict: text("last_verdict").$type<VerifyVerdictValue>(),
    lastTestedAt: integer("last_tested_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("uq_tester_model").on(table.providerId, table.requestedModel),
  ],
);

export const testerTests = sqliteTable(
  "tester_tests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    modelId: text("model_id")
      .notNull()
      .references(() => testerModels.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    verdict: text("verdict").$type<VerifyVerdictValue>().notNull(),
    versionUnverifiable: integer("version_unverifiable", { mode: "boolean" })
      .notNull()
      .default(false),
    detectedModel: text("detected_model"),
    probesPassed: integer("probes_passed").notNull().default(0),
    probesTotal: integer("probes_total").notNull().default(0),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    latencyMs: integer("latency_ms").notNull().default(0),
    transport: text("transport").notNull().default("direct"),
    resolvedFormat: text("resolved_format"),
    formatFellBack: integer("format_fell_back", { mode: "boolean" })
      .notNull()
      .default(false),
    testedAt: integer("tested_at", { mode: "timestamp_ms" }).notNull(),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    submitterUserId: integer("submitter_user_id"),
    submitterUsername: text("submitter_username"),
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    kind: text("kind").$type<VerifyProviderValue>(),
    baseUrlHost: text("base_url_host"),
    requestedModel: text("requested_model"),
    ...timestamps(),
  },
  (table) => [
    index("idx_tester_test_user_tested").on(table.userId, table.testedAt),
    index("idx_tester_test_model").on(table.modelId),
    index("idx_tester_test_published").on(table.publishedAt),
    index("idx_tester_test_verified").on(table.verifiedAt),
    index("idx_tester_test_host_model").on(
      table.baseUrlHost,
      table.requestedModel,
    ),
    index("idx_tester_test_submitter").on(
      table.submitterUserId,
      table.baseUrlHost,
      table.requestedModel,
    ),
  ],
);

export const testerProbes = sqliteTable(
  "tester_probes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    testId: text("test_id")
      .notNull()
      .references(() => testerTests.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    label: text("label").notNull(),
    prompt: text("prompt").notNull(),
    responseText: text("response_text"),
    httpStatus: integer("http_status"),
    pass: integer("pass", { mode: "boolean" }).notNull().default(false),
    transient: integer("transient", { mode: "boolean" })
      .notNull()
      .default(false),
    signal: text("signal"),
    reason: text("reason"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    latencyMs: integer("latency_ms").notNull().default(0),
  },
  (table) => [
    index("idx_tester_probe_test").on(table.testId, table.orderIndex),
  ],
);
