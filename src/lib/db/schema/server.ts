import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { uid } from "@/lib/utils/base";

// Server-only schema: never mirrored to the browser. Client code must NEVER
// import this file.

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

export const loraCatalog = sqliteTable(
  "lora_catalog",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    source: text("source").notNull(),
    sourceId: text("source_id").notNull(),
    filename: text("filename").notNull(),
    baseModel: text("base_model").notNull(),
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
    index("idx_lora_basemodel_visible").on(table.baseModel, table.visible),
    index("idx_lora_category").on(table.category),
  ],
);

export const embeddingCatalog = sqliteTable(
  "embedding_catalog",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    source: text("source").notNull(),
    sourceId: text("source_id").notNull(),
    filename: text("filename").notNull(),
    baseModel: text("base_model").notNull(),
    category: text("category").notNull(),
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
    index("idx_embedding_basemodel_visible").on(table.baseModel, table.visible),
    index("idx_embedding_category").on(table.category),
  ],
);

export const upscalerCatalog = sqliteTable(
  "upscaler_catalog",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    filename: text("filename").notNull(),
    category: text("category").notNull(),
    nativeScale: integer("native_scale").notNull().default(4),
    description: text("description"),
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
    index("idx_upscaler_category_visible").on(table.category, table.visible),
  ],
);

export const controlNetCatalog = sqliteTable(
  "controlnet_catalog",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    filename: text("filename").notNull(),
    baseModel: text("base_model").notNull(),
    kind: text("kind").notNull(),
    description: text("description"),
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
    index("idx_controlnet_basemodel_kind").on(table.baseModel, table.kind),
  ],
);

export type AcpCheckoutSession = typeof acpCheckoutSessions.$inferSelect;
export type LoraCatalogEntry = typeof loraCatalog.$inferSelect;
export type EmbeddingCatalogEntry = typeof embeddingCatalog.$inferSelect;
export type UpscalerCatalogEntry = typeof upscalerCatalog.$inferSelect;
export type ControlNetCatalogEntry = typeof controlNetCatalog.$inferSelect;
