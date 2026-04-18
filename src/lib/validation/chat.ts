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

const MAX_ID_LEN = 64;
const MAX_TEXT_LEN = 100_000;
const MAX_MODEL_LEN = 128;
const MAX_TITLE_LEN = 200;
const MAX_URL_LEN = 2048;
const MAX_TITLE_SEED_LEN = 10_000;
const MAX_MESSAGES_PER_PERSIST = 500;
const MAX_MESSAGES_PER_STREAM = 200;
const MAX_PARTS_PER_MESSAGE = 200;
const MAX_CLAIM_CONV_IDS = 500;

const messagePart = t.Union([
  t.Object(
    { type: t.Literal("text"), text: t.String({ maxLength: MAX_TEXT_LEN }) },
    { additionalProperties: true },
  ),
  t.Object(
    {
      type: t.Literal("reasoning"),
      reasoning: t.String({ maxLength: MAX_TEXT_LEN }),
    },
    { additionalProperties: true },
  ),
  t.Object(
    {
      type: t.Literal("tool-invocation"),
      toolInvocationId: t.String({ maxLength: MAX_ID_LEN }),
    },
    { additionalProperties: true },
  ),
  t.Object({ type: t.Literal("file") }, { additionalProperties: true }),
  t.Object({ type: t.Literal("source-url") }, { additionalProperties: true }),
  t.Object(
    {
      type: t.Literal("task"),
      taskId: t.String({ maxLength: MAX_ID_LEN }),
      status: t.String({ maxLength: 32 }),
      progress: t.String({ maxLength: 16 }),
      model: t.String({ maxLength: MAX_MODEL_LEN }),
    },
    { additionalProperties: true },
  ),
  // Catch-all for unknown/future part types
  t.Object(
    { type: t.String({ maxLength: 64 }) },
    { additionalProperties: true },
  ),
]);

export const createConversationBody = t.Object({
  id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
  model: t.String({ maxLength: MAX_MODEL_LEN }),
  title: t.Optional(t.String({ maxLength: MAX_TITLE_LEN })),
});
export type CreateConversationBody = Static<typeof createConversationBody>;

export const updateConversationBody = t.Object({
  title: t.Optional(t.String({ maxLength: MAX_TITLE_LEN })),
  model: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
});
export type UpdateConversationBody = Static<typeof updateConversationBody>;

export const persistMessagesBody = t.Object({
  messages: t.Array(
    t.Object({
      id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
      parentId: t.Optional(
        t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()]),
      ),
      role: persistMessageRole,
      model: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
      parts: t.Array(messagePart, { maxItems: MAX_PARTS_PER_MESSAGE }),
    }),
    { maxItems: MAX_MESSAGES_PER_PERSIST },
  ),
});
export type PersistMessagesBody = Static<typeof persistMessagesBody>;

export const paginationQuery = t.Object({
  p: t.Optional(t.Number({ minimum: 1 })),
  page_size: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
});

export const chatSearchQuery = t.Composite([
  paginationQuery,
  t.Object({ keyword: t.Optional(t.String({ maxLength: 200 })) }),
]);
export type ChatSearchQuery = Static<typeof chatSearchQuery>;

export const streamBody = t.Object({
  model: t.String({ maxLength: MAX_MODEL_LEN }),
  // Messages are typed by the AI SDK (UIMessage); schema validation
  // is handled by convertToModelMessages at runtime.
  messages: t.Array(t.Any(), { maxItems: MAX_MESSAGES_PER_STREAM }),
  convId: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
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
  convId: t.String({ maxLength: MAX_ID_LEN }),
});

export const titleGenerationBody = t.Object({
  text: t.String({ maxLength: MAX_TITLE_SEED_LEN }),
});
export type TitleGenerationBody = Static<typeof titleGenerationBody>;

export const claimConversationsBody = t.Object({
  convIds: t.Array(t.String({ maxLength: MAX_ID_LEN }), {
    maxItems: MAX_CLAIM_CONV_IDS,
  }),
});
export type ClaimConversationsBody = Static<typeof claimConversationsBody>;

export const finalizeTaskBody = t.Object({
  msgId: t.String({ maxLength: MAX_ID_LEN }),
  taskId: t.String({ maxLength: MAX_ID_LEN }),
  resultUrl: t.String({ maxLength: MAX_URL_LEN }),
});
export type FinalizeTaskBody = Static<typeof finalizeTaskBody>;
