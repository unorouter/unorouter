import type { Static } from "elysia";
import { t } from "elysia";

export const createConversationBody = t.Object({
  id: t.Optional(t.String()),
  model: t.String(),
  title: t.Optional(t.String()),
});
export type CreateConversationBody = Static<typeof createConversationBody>;

export const updateConversationBody = t.Object({
  title: t.Optional(t.String()),
  model: t.Optional(t.String()),
});
export type UpdateConversationBody = Static<typeof updateConversationBody>;

export const persistMessagesBody = t.Object({
  messages: t.Array(
    t.Object({
      role: t.String(),
      model: t.Optional(t.String()),
      parts: t.Any(),
    }),
  ),
});
export type PersistMessagesBody = Static<typeof persistMessagesBody>;

export const paginationQuery = t.Object({
  p: t.Optional(t.Number()),
  page_size: t.Optional(t.Number()),
});

export const chatSearchQuery = t.Composite([
  paginationQuery,
  t.Object({ keyword: t.Optional(t.String()) }),
]);
export type ChatSearchQuery = Static<typeof chatSearchQuery>;

export const streamBody = t.Object({
  model: t.String(),
  messages: t.Any(),
  convId: t.Optional(t.Union([t.String(), t.Null()])),
  webSearch: t.Optional(t.Boolean()),
});

export const mediaUploadBody = t.Object({
  file: t.File({
    type: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    maxSize: "20m",
  }),
  convId: t.String(),
});

export const titleGenerationBody = t.Object({
  text: t.String(),
});
export type TitleGenerationBody = Static<typeof titleGenerationBody>;

export const claimConversationsBody = t.Object({
  convIds: t.Array(t.String()),
});
export type ClaimConversationsBody = Static<typeof claimConversationsBody>;
