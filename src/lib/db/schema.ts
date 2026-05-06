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

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    title: text("title"),
    shareId: text("share_id").unique(),
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalCost: real("total_cost").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_conv_user_updated").on(table.userId, table.updatedAt),
    index("idx_conv_share").on(table.shareId),
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
  // Inline sampling overrides (per-conversation). Null = use preset / model default.
  // When non-null, these win over any bound preset.
  temperature: real("temperature"),
  topP: real("top_p"),
  topK: integer("top_k"),
  minP: real("min_p"),
  topA: real("top_a"),
  frequencyPenalty: real("frequency_penalty"),
  presencePenalty: real("presence_penalty"),
  repetitionPenalty: real("repetition_penalty"),
  maxTokens: integer("max_tokens"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// ---------------------------------------------------------------------------
// Messages + items (normalized; matches OpenAI Responses API output shape)
// ---------------------------------------------------------------------------

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
    generationId: text("generation_id"),
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

// ---------------------------------------------------------------------------
// Characters (SillyTavern-compatible)
// ---------------------------------------------------------------------------

export const characters = sqliteTable(
  "characters",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    avatarR2Key: text("avatar_r2_key"),
    description: text("description"),
    personality: text("personality"),
    scenario: text("scenario"),
    firstMessage: text("first_message"),
    exampleMessages: text("example_messages"),
    systemPrompt: text("system_prompt"),
    postHistoryInstructions: text("post_history_instructions"),
    defaultReasoningEffort: text("default_reasoning_effort"),
    tags: text("tags", { mode: "json" }),
    nsfw: integer("nsfw", { mode: "boolean" }).notNull().default(false),
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
  ],
);

// ---------------------------------------------------------------------------
// Personas (the user's own RP identity)
// ---------------------------------------------------------------------------

export const personas = sqliteTable(
  "personas",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    avatarR2Key: text("avatar_r2_key"),
    isDefault: integer("is_default", { mode: "boolean" })
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
    index("idx_persona_user_default").on(table.userId, table.isDefault),
    index("idx_persona_user").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// Lorebooks + entries
// ---------------------------------------------------------------------------

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
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
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

// ---------------------------------------------------------------------------
// Sampling presets
// ---------------------------------------------------------------------------

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
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("idx_preset_user_name").on(table.userId, table.name)],
);

// ---------------------------------------------------------------------------
// Conversation bindings (m:n)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Media (untouched; reused for character avatars and chat attachments)
// ---------------------------------------------------------------------------

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
    r2Key: text("r2_key").notNull(),
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

// ---------------------------------------------------------------------------
// Moderation log (untouched)
// ---------------------------------------------------------------------------

export const moderationLog = sqliteTable(
  "moderation_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    convId: text("conv_id"),
    model: text("model").notNull(),
    mediaType: text("media_type").notNull(),
    decision: text("decision").notNull(),
    reason: text("reason"),
    prompt: text("prompt").notNull(),
    externalId: text("external_id").notNull(),
    creemId: text("creem_id"),
    units: integer("units"),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_modlog_user_created").on(table.userId, table.createdAt),
    index("idx_modlog_decision").on(table.decision, table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// ACP checkout (untouched)
// ---------------------------------------------------------------------------

export const acpCheckoutSessions = sqliteTable(
  "acp_checkout_sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    status: text("status").notNull(),
    currency: text("currency").notNull().default("usd"),
    itemId: text("item_id").notNull(),
    quantity: integer("quantity").notNull().default(1),
    amountCents: integer("amount_cents").notNull(),
    paymentMethod: text("payment_method").notNull(),
    payLink: text("pay_link"),
    quotaAtComplete: integer("quota_at_complete"),
    body: text("body", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("idx_acp_user_created").on(table.userId, table.createdAt)],
);

export const acpIdempotencyKeys = sqliteTable(
  "acp_idempotency_keys",
  {
    key: text("key").notNull(),
    userId: integer("user_id").notNull(),
    path: text("path").notNull(),
    bodyHash: text("body_hash").notNull(),
    status: integer("status").notNull(),
    response: text("response", { mode: "json" }).notNull(),
    state: text("state").notNull().default("done"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_acp_idem_lookup").on(table.userId, table.key, table.path),
    index("idx_acp_idem_created").on(table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types (only the ones actually imported elsewhere)
// ---------------------------------------------------------------------------

export type Message = typeof messages.$inferSelect;
export type MessageItem = typeof messageItems.$inferSelect;
export type AcpCheckoutSession = typeof acpCheckoutSessions.$inferSelect;
