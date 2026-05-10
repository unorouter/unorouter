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
  // Free-form JSON merged into the request body before stream. Power-user
  // escape hatch for fields the slider UI doesn't cover (e.g. reasoning_effort,
  // service_tier, prediction). Sliders win on key conflicts.
  extraBody: text("extra_body"),
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
    /** Free-form JSON merged into request body. See conversationSettings.extraBody. */
    extraBody: text("extra_body"),
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
// Image generation
// ---------------------------------------------------------------------------

// generations is one row per user submit (one click of Generate). The N
// images that come back live in generation_images, linked by FK with
// cascade-delete. Stored regardless of user visibility so the public feed
// has content even if creators set their gens to private later.
export const generations = sqliteTable(
  "generations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    // How many images the user asked for (1, 2, or 4). Drives the UI's
    // "generating M of N" progress display until all N images are saved.
    requestedCount: integer("requested_count").notNull().default(1),
    // Upstream task id from new-api; nullable while submit is in flight.
    taskId: text("task_id"),
    model: text("model").notNull(),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    // Compact JSON: { width, height, steps, cfg, guidance, sampler,
    // scheduler, seed, denoise, n }. Schema is per-model; readers should
    // tolerate missing keys.
    params: text("params", { mode: "json" }),
    // [{ name, weight, source: "civitai-id" | "hf-id" | "filename" }]
    loras: text("loras", { mode: "json" }),
    // [{ url, name?, weight? }] - the raw refs the user submitted, plus
    // r2Url for ones we re-uploaded. Null for non-compose models.
    references: text("references", { mode: "json" }),
    // Free-form spillover (Flux 2 guidance, future per-model knobs).
    extraParams: text("extra_params", { mode: "json" }),
    // Status mirrors new-api's task lifecycle:
    //   pending     row inserted, upstream submit in flight
    //   submitted   upstream returned task_id
    //   in_progress upstream worker is generating
    //   success     all generation_images rows populated, cost settled
    //   failure     errorMessage populated, quota refunded
    status: text("status").notNull().default("pending"),
    progress: text("progress"),
    // The price we billed the user, in unorouter quota units. Settled on
    // terminal success, refunded on failure.
    costQuota: integer("cost_quota"),
    // private (default), unlisted (link-only), public (in feed).
    visibility: text("visibility").notNull().default("private"),
    // Public share token. When set, anyone with the URL /shared/<shareId>
    // can view the generation (read-only). Null = sharing revoked /
    // never enabled. Same shape as conversations.shareId.
    shareId: text("share_id").unique(),
    // NSFW flag persists per-image so future moderation can hide entries
    // without wiping the row. Default true since most catalog models are
    // NSFW-capable; UI can flip on submit.
    nsfw: integer("nsfw", { mode: "boolean" }).notNull().default(true),
    flagged: integer("flagged", { mode: "boolean" }).notNull().default(false),
    flagReason: text("flag_reason"),
    // Denormalized counters for cheap feed sorts.
    remixCount: integer("remix_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    // Lineage: if this gen was a remix of another, points back. ON DELETE
    // SET NULL so deleting the parent doesn't cascade-kill descendants.
    remixedFrom: text("remixed_from"),
    errorMessage: text("error_message"),
    // The submitter's API key, captured at submit time so the server-side
    // sweeper can poll upstream as the same user when the client tab is
    // closed. Cleared on terminal status to limit exposure.
    submittedKey: text("submitted_key"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    // Auto-deletion timestamp. Set on insert to createdAt + 30 days. The
    // retention sweeper scans for rows past expiresAt and cascades the
    // delete (DB row + R2 objects). UI shows a warning badge inside the
    // last 7 days.
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    // user history pages, mine sort
    index("idx_gen_user_created").on(table.userId, table.createdAt),
    // public feed query
    index("idx_gen_visibility_created").on(table.visibility, table.createdAt),
    // per-model browse
    index("idx_gen_model_created").on(table.model, table.createdAt),
    // upstream cross-reference (poller looks up rows by taskId)
    index("idx_gen_task").on(table.taskId),
    // lineage walks
    index("idx_gen_remixed_from").on(table.remixedFrom),
    // retention sweeper scan
    index("idx_gen_expires").on(table.expiresAt),
    // public share lookup
    index("idx_gen_share").on(table.shareId),
  ],
);

// One image attached to a generation. v1 supports up to 4 images per row
// (matches the form's variants buttons 1/2/4). The (generationId,
// sequenceIndex) compound PK enforces ordering and de-dupes accidental
// double-inserts during retry. Cascade delete fires when the parent row
// is removed (whether by deleteGeneration or by the retention sweeper).
export const generationImages = sqliteTable(
  "generation_images",
  {
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    sequenceIndex: integer("sequence_index").notNull(),
    // Raw upstream URL pre-R2 (data: URI or S3). Kept for debugging; the
    // canonical user-facing link is r2Url.
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
    primaryKey({ columns: [table.generationId, table.sequenceIndex] }),
    index("idx_genimg_generation_id").on(table.generationId),
  ],
);

// generation_likes is the join table for "favorited" / "liked" gens. Kept
// separate from generations so we can drop / rebuild without losing the
// underlying images.
export const generationLikes = sqliteTable(
  "generation_likes",
  {
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    primaryKey({ columns: [table.generationId, table.userId] }),
    index("idx_likes_user").on(table.userId),
  ],
);

// loraCatalog is the curated set of LoRAs we expose in the picker.
// Operators add rows manually (admin-only API in v1). The filename must
// match exactly what's on the RunPod network volume at
// /workspace/models/loras/, since LoraLoader.lora_name is patched with
// this string verbatim by new-api's applyLoraChain.
export const loraCatalog = sqliteTable(
  "lora_catalog",
  {
    // Slug we coin (e.g. "anatomy-fix-pony-v3"). Stable across re-syncs.
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    // "civitai" | "hf" | "local"
    source: text("source").notNull(),
    // Upstream id for re-download / attribution (Civitai version id, HF
    // path, or empty for local).
    sourceId: text("source_id").notNull(),
    filename: text("filename").notNull(),
    // "pony" | "sdxl" | "flux2" | "z-image" - constrains which models
    // can use the LoRA. Picker filters by selected model's family.
    baseModel: text("base_model").notNull(),
    // "anatomy" | "style" | "character" | "concept"
    category: text("category").notNull(),
    defaultWeight: real("default_weight").notNull().default(1.0),
    description: text("description"),
    thumbnailR2Key: text("thumbnail_r2_key"),
    nsfw: integer("nsfw", { mode: "boolean" }).notNull().default(false),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // picker query: visible LoRAs for selected model family
    index("idx_lora_basemodel_visible").on(table.baseModel, table.visible),
    // category facet
    index("idx_lora_category").on(table.category),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types (only the ones actually imported elsewhere)
// ---------------------------------------------------------------------------

export type Message = typeof messages.$inferSelect;
export type MessageItem = typeof messageItems.$inferSelect;
export type AcpCheckoutSession = typeof acpCheckoutSessions.$inferSelect;
export type Generation = typeof generations.$inferSelect;
export type GenerationImage = typeof generationImages.$inferSelect;
export type GenerationLike = typeof generationLikes.$inferSelect;
export type LoraCatalogEntry = typeof loraCatalog.$inferSelect;
