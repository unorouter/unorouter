import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { uid } from "@/lib/utils/base";
import { timestamps } from "./shared";

export const blogComments = sqliteTable(
  "blog_comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    postSlug: text("post_slug").notNull(),
    parentId: text("parent_id"),
    userId: integer("user_id").notNull(),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    hiddenAt: integer("hidden_at", { mode: "timestamp_ms" }),
    hiddenBy: integer("hidden_by"),
    ...timestamps(),
  },
  (table) => [
    index("idx_blog_comment_post").on(table.postSlug, table.createdAt),
    index("idx_blog_comment_user").on(table.userId, table.createdAt),
  ],
);

export const blogCommentVotes = sqliteTable(
  "blog_comment_votes",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => blogComments.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull(),
    value: integer("value").notNull(),
    ...timestamps(),
  },
  (table) => [primaryKey({ columns: [table.commentId, table.userId] })],
);

export const blogPostReactions = sqliteTable(
  "blog_post_reactions",
  {
    postSlug: text("post_slug").notNull(),
    userId: integer("user_id").notNull(),
    kind: text("kind").notNull(),
    ...timestamps(),
  },
  (table) => [
    primaryKey({ columns: [table.postSlug, table.userId, table.kind] }),
  ],
);

// One row per post, visitor and UTC day keeps view writes inside the free
// Turso write quota.
export const blogPostViews = sqliteTable(
  "blog_post_views",
  {
    postSlug: text("post_slug").notNull(),
    visitor: text("visitor").notNull(),
    day: text("day").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postSlug, table.visitor, table.day] }),
  ],
);
