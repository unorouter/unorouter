import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { uid } from "@/lib/utils/base";

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    title: text("title"),
    model: text("model").notNull(),
    shareId: text("share_id").unique(),
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalCost: real("total_cost").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    starredAt: integer("starred_at", { mode: "timestamp_ms" }),
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
    index("idx_conv_archived").on(table.userId, table.archivedAt),
    index("idx_conv_starred").on(table.userId, table.starredAt),
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
    parentId: text("parent_id"),
    role: text("role").notNull(),
    model: text("model"),
    parts: text("parts", { mode: "json" }).notNull(),
    requestId: text("request_id"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cost: real("cost"),
    rawResponse: text("raw_response"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_msg_conv").on(table.convId),
    index("idx_msg_parent").on(table.convId, table.parentId),
  ],
);

export const media = sqliteTable(
  "media",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    convId: text("conv_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("idx_media_user").on(table.userId),
    index("idx_media_conv").on(table.convId),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
