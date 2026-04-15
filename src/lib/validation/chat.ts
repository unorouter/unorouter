import type { Static } from "elysia";
import { t } from "elysia";

// Permissive-but-structured message part schema.
// Known part types are explicit; unknown future types pass through via the catch-all.
const persistMessageRole = t.Union([
  t.Literal("system"),
  t.Literal("user"),
  t.Literal("assistant"),
  t.Literal("tool"),
]);

const messagePart = t.Union([
  t.Object(
    { type: t.Literal("text"), text: t.String() },
    { additionalProperties: true },
  ),
  t.Object(
    { type: t.Literal("reasoning"), reasoning: t.String() },
    { additionalProperties: true },
  ),
  t.Object(
    { type: t.Literal("tool-invocation"), toolInvocationId: t.String() },
    { additionalProperties: true },
  ),
  t.Object({ type: t.Literal("file") }, { additionalProperties: true }),
  t.Object({ type: t.Literal("source-url") }, { additionalProperties: true }),
  t.Object(
    {
      type: t.Literal("task"),
      taskId: t.String(),
      status: t.String(),
      progress: t.String(),
      model: t.String(),
    },
    { additionalProperties: true },
  ),
  // Catch-all for unknown/future part types
  t.Object({ type: t.String() }, { additionalProperties: true }),
]);

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
      role: persistMessageRole,
      model: t.Optional(t.String()),
      parts: t.Array(messagePart),
    }),
  ),
});
export type PersistMessagesBody = Static<typeof persistMessagesBody>;

export const paginationQuery = t.Object({
  p: t.Optional(t.Number({ minimum: 1 })),
  page_size: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
});

export const chatSearchQuery = t.Composite([
  paginationQuery,
  t.Object({ keyword: t.Optional(t.String()) }),
]);
export type ChatSearchQuery = Static<typeof chatSearchQuery>;

export const streamBody = t.Object({
  model: t.String(),
  // Messages are typed by the AI SDK (UIMessage); schema validation
  // is handled by convertToModelMessages at runtime.
  messages: t.Array(t.Any()),
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

export const finalizeTaskBody = t.Object({
  msgId: t.String(),
  taskId: t.String(),
  resultUrl: t.String(),
});
export type FinalizeTaskBody = Static<typeof finalizeTaskBody>;
