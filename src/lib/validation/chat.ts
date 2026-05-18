import type { Static } from "elysia";
import { t } from "elysia";

const MAX_ID_LEN = 64;
const MAX_TEXT_LEN = 100_000;
const MAX_MODEL_LEN = 128;
const MAX_TITLE_LEN = 200;
const MAX_URL_LEN = 2048;
const MAX_TITLE_SEED_LEN = 10_000;
const MAX_MESSAGES_PER_PERSIST = 500;
const MAX_MESSAGES_PER_STREAM = 200;
const MAX_ITEMS_PER_MESSAGE = 200;
const MAX_CLAIM_CONV_IDS = 500;

const persistMessageRole = t.Union([
  t.Literal("system"),
  t.Literal("user"),
  t.Literal("assistant"),
  t.Literal("tool"),
]);

const itemTextData = t.Object({ text: t.String({ maxLength: MAX_TEXT_LEN }) });
const itemReasoningData = t.Object({
  text: t.String({ maxLength: MAX_TEXT_LEN }),
  status: t.Optional(t.String({ maxLength: 32 })),
});
const itemToolCallData = t.Object(
  {
    tool_name: t.String({ maxLength: MAX_ID_LEN }),
    tool_call_id: t.String({ maxLength: MAX_ID_LEN }),
    args: t.Unknown(),
  },
  { additionalProperties: true },
);
const itemToolResultData = t.Object(
  {
    tool_call_id: t.String({ maxLength: MAX_ID_LEN }),
    result: t.Unknown(),
  },
  { additionalProperties: true },
);
const itemFileData = t.Object(
  {
    url: t.String({ maxLength: MAX_URL_LEN }),
    mime_type: t.String({ maxLength: 128 }),
    name: t.Optional(t.String({ maxLength: 256 })),
    r2_key: t.Optional(t.String({ maxLength: 512 })),
  },
  { additionalProperties: true },
);
const itemTaskData = t.Object(
  {
    task_id: t.String({ maxLength: MAX_ID_LEN }),
    model: t.String({ maxLength: MAX_MODEL_LEN }),
    status: t.String({ maxLength: 32 }),
    progress: t.Optional(t.String({ maxLength: 16 })),
  },
  { additionalProperties: true },
);

const persistMessageItem = t.Union([
  t.Object({
    id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
    type: t.Literal("text"),
    output_index: t.Optional(t.Number()),
    data: itemTextData,
  }),
  t.Object({
    id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
    type: t.Literal("reasoning"),
    output_index: t.Optional(t.Number()),
    data: itemReasoningData,
  }),
  t.Object({
    id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
    type: t.Literal("tool_call"),
    output_index: t.Optional(t.Number()),
    data: itemToolCallData,
  }),
  t.Object({
    id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
    type: t.Literal("tool_result"),
    output_index: t.Optional(t.Number()),
    data: itemToolResultData,
  }),
  t.Object({
    id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
    type: t.Literal("file"),
    output_index: t.Optional(t.Number()),
    data: itemFileData,
  }),
  t.Object({
    id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
    type: t.Literal("image"),
    output_index: t.Optional(t.Number()),
    data: itemFileData,
  }),
  t.Object({
    id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
    type: t.Literal("task"),
    output_index: t.Optional(t.Number()),
    data: itemTaskData,
  }),
]);
export type PersistMessageItem = Static<typeof persistMessageItem>;

export const reasoningEffort = t.Union([
  t.Literal("xhigh"),
  t.Literal("high"),
  t.Literal("medium"),
  t.Literal("low"),
  t.Literal("minimal"),
  t.Literal("none"),
]);

// Keep in sync with `chatDefaultsAtom` in `src/store/chat-store.ts`.
export const streamOverrides = t.Object({
  reasoningEffort: t.Optional(t.Union([reasoningEffort, t.Null()])),
  chatMemory: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
  systemPromptOverride: t.Optional(
    t.Union([t.String({ maxLength: MAX_TEXT_LEN }), t.Null()]),
  ),
  authorNote: t.Optional(
    t.Union([t.String({ maxLength: MAX_TEXT_LEN }), t.Null()]),
  ),
  authorNoteDepth: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  webSearchEnabled: t.Optional(t.Boolean()),
  webSearchEngine: t.Optional(
    t.Union([
      t.Literal("auto"),
      t.Literal("native"),
      t.Literal("exa"),
      t.Literal("tavily"),
    ]),
  ),
  webSearchContextSize: t.Optional(
    t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")]),
  ),
  temperature: t.Optional(
    t.Union([t.Number({ minimum: 0, maximum: 2 }), t.Null()]),
  ),
  topP: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()])),
  topK: t.Optional(
    t.Union([t.Number({ minimum: 0, maximum: 1000 }), t.Null()]),
  ),
  minP: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()])),
  topA: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()])),
  frequencyPenalty: t.Optional(
    t.Union([t.Number({ minimum: -2, maximum: 2 }), t.Null()]),
  ),
  presencePenalty: t.Optional(
    t.Union([t.Number({ minimum: -2, maximum: 2 }), t.Null()]),
  ),
  repetitionPenalty: t.Optional(
    t.Union([t.Number({ minimum: 0, maximum: 2 }), t.Null()]),
  ),
  maxTokens: t.Optional(
    t.Union([t.Number({ minimum: 1, maximum: 1_000_000 }), t.Null()]),
  ),
  // Sliders win on key conflicts. Parsed at the prompt assembler.
  extraBody: t.Optional(t.Union([t.String({ maxLength: 8_192 }), t.Null()])),
  // false = BFF buffers full upstream reply, then emits one chunk.
  streamingEnabled: t.Optional(t.Boolean()),
});
export type StreamOverrides = Static<typeof streamOverrides>;

export const createConversationBody = t.Object({
  id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
  model: t.String({ maxLength: MAX_MODEL_LEN }),
  title: t.Optional(t.String({ maxLength: MAX_TITLE_LEN })),
  overrides: t.Optional(streamOverrides),
});
export type CreateConversationBody = Static<typeof createConversationBody>;

export const updateConversationBody = t.Object({
  title: t.Optional(t.String({ maxLength: MAX_TITLE_LEN })),
  model: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
});
export type UpdateConversationBody = Static<typeof updateConversationBody>;

export const updateConversationSettingsBody = t.Object({
  defaultModel: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
  personaId: t.Optional(
    t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()]),
  ),
  presetId: t.Optional(
    t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()]),
  ),
  systemPromptOverride: t.Optional(
    t.Union([t.String({ maxLength: MAX_TEXT_LEN }), t.Null()]),
  ),
  authorNote: t.Optional(
    t.Union([t.String({ maxLength: MAX_TEXT_LEN }), t.Null()]),
  ),
  authorNoteDepth: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  chatMemory: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
  reasoningEffort: t.Optional(t.Union([reasoningEffort, t.Null()])),
  webSearchEnabled: t.Optional(t.Boolean()),
  webSearchEngine: t.Optional(
    t.Union([
      t.Literal("auto"),
      t.Literal("native"),
      t.Literal("exa"),
      t.Literal("tavily"),
    ]),
  ),
  webSearchContextSize: t.Optional(
    t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")]),
  ),
  temperature: t.Optional(
    t.Union([t.Number({ minimum: 0, maximum: 2 }), t.Null()]),
  ),
  topP: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()])),
  topK: t.Optional(
    t.Union([t.Number({ minimum: 0, maximum: 1000 }), t.Null()]),
  ),
  minP: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()])),
  topA: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()])),
  frequencyPenalty: t.Optional(
    t.Union([t.Number({ minimum: -2, maximum: 2 }), t.Null()]),
  ),
  presencePenalty: t.Optional(
    t.Union([t.Number({ minimum: -2, maximum: 2 }), t.Null()]),
  ),
  repetitionPenalty: t.Optional(
    t.Union([t.Number({ minimum: 0, maximum: 2 }), t.Null()]),
  ),
  maxTokens: t.Optional(
    t.Union([t.Number({ minimum: 1, maximum: 1_000_000 }), t.Null()]),
  ),
  extraBody: t.Optional(t.Union([t.String({ maxLength: 8_192 }), t.Null()])),
  streamingEnabled: t.Optional(t.Boolean()),
});
export type UpdateConversationSettingsBody = Static<
  typeof updateConversationSettingsBody
>;

export const updateConversationBindingsBody = t.Object({
  characters: t.Optional(
    t.Array(
      t.Object({
        characterId: t.String({ maxLength: MAX_ID_LEN }),
        orderIndex: t.Optional(t.Number()),
        isActive: t.Optional(t.Boolean()),
        overrides: t.Optional(t.Unknown()),
      }),
    ),
  ),
  lorebookIds: t.Optional(
    t.Array(t.String({ maxLength: MAX_ID_LEN }), { maxItems: 64 }),
  ),
});
export type UpdateConversationBindingsBody = Static<
  typeof updateConversationBindingsBody
>;

export const editMessageBody = t.Object({
  items: t.Array(persistMessageItem, { maxItems: MAX_ITEMS_PER_MESSAGE }),
});

export const setActiveBranchBody = t.Object({
  messageId: t.String({ maxLength: MAX_ID_LEN }),
});

export const persistMessagesBody = t.Object({
  messages: t.Array(
    t.Object({
      id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
      parentId: t.Optional(
        t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()]),
      ),
      characterId: t.Optional(
        t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()]),
      ),
      role: persistMessageRole,
      model: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
      items: t.Array(persistMessageItem, { maxItems: MAX_ITEMS_PER_MESSAGE }),
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

// Loose `Any()`: each entity body has its own validation surface; re-checking
// here would double-cost on every turn.
export const chatContext = t.Object({
  persona: t.Optional(t.Union([t.Any(), t.Null()])),
  characters: t.Optional(t.Array(t.Any(), { maxItems: 64 })),
  lorebooks: t.Optional(
    t.Array(
      t.Object({
        lorebook: t.Any(),
        entries: t.Array(t.Any(), { maxItems: 1024 }),
      }),
      { maxItems: 16 },
    ),
  ),
  preset: t.Optional(t.Union([t.Any(), t.Null()])),
  settings: t.Optional(t.Union([t.Any(), t.Null()])),
});
export type ChatContext = Static<typeof chatContext>;

export const streamBody = t.Object({
  model: t.String({ maxLength: MAX_MODEL_LEN }),
  messages: t.Array(t.Any(), { maxItems: MAX_MESSAGES_PER_STREAM }),
  convId: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
  webSearch: t.Optional(t.Boolean()),
  // Fallback for guest convs (no settings row). Logged-in convs have a row
  // seeded at creation, so these are ignored on subsequent turns.
  overrides: t.Optional(streamOverrides),
  chatContext: t.Optional(chatContext),
});
export type StreamBody = Static<typeof streamBody>;

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
  model: t.Optional(t.String()),
});

export const claimConversationsBody = t.Object({
  convIds: t.Array(t.String({ maxLength: MAX_ID_LEN }), {
    maxItems: MAX_CLAIM_CONV_IDS,
  }),
});

export const finalizeTaskBody = t.Object({
  msgId: t.String({ maxLength: MAX_ID_LEN }),
  taskId: t.String({ maxLength: MAX_ID_LEN }),
  resultUrl: t.String({ maxLength: MAX_URL_LEN }),
});
export type FinalizeTaskBody = Static<typeof finalizeTaskBody>;
