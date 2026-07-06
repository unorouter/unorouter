import { NONE_VALUE } from "@/lib/config/constants";
import type { Static } from "elysia";
import { t } from "elysia";
import { samplingOptional, unionLiterals } from "./helpers";

const MAX_ID_LEN = 64;
const MAX_TEXT_LEN = 100_000;
const MAX_MODEL_LEN = 128;
const MAX_URL_LEN = 2048;
const MAX_TITLE_SEED_LEN = 10_000;
const MAX_MESSAGES_PER_STREAM = 200;

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
    kind: t.Optional(t.String({ maxLength: 16 })),
  },
  { additionalProperties: true },
);
const itemErrorData = t.Object(
  {
    message: t.String({ maxLength: 4_096 }),
    model: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
  },
  { additionalProperties: true },
);

const ITEM_DATA_SCHEMAS = [
  ["text", itemTextData],
  ["reasoning", itemReasoningData],
  ["tool_call", itemToolCallData],
  ["tool_result", itemToolResultData],
  ["file", itemFileData],
  ["image", itemFileData],
  ["task", itemTaskData],
  ["error", itemErrorData],
] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _persistMessageItem = t.Union(
  ITEM_DATA_SCHEMAS.map(([type, data]) =>
    t.Object({
      id: t.Optional(t.String({ maxLength: MAX_ID_LEN })),
      type: t.Literal(type),
      output_index: t.Optional(t.Number()),
      data,
    }),
  ),
);
export type PersistMessageItem = Static<typeof _persistMessageItem>;

export const messageRole = t.Union([
  t.Literal("system"),
  t.Literal("user"),
  t.Literal("assistant"),
  t.Literal("tool"),
]);
export type MessageRole = Static<typeof messageRole>;

export const messageItemType = t.Union([
  t.Literal("text"),
  t.Literal("reasoning"),
  t.Literal("tool_call"),
  t.Literal("tool_result"),
  t.Literal("file"),
  t.Literal("image"),
  t.Literal("task"),
  t.Literal("error"),
]);
export type MessageItemType = Static<typeof messageItemType>;

export const reasoningEffort = t.Union([
  t.Literal("xhigh"),
  t.Literal("high"),
  t.Literal("medium"),
  t.Literal("low"),
  t.Literal("minimal"),
  t.Literal("none"),
]);
export type ReasoningEffort = Static<typeof reasoningEffort>;

export const webSearchEngine = t.Union([
  t.Literal("auto"),
  t.Literal("native"),
  t.Literal("exa"),
  t.Literal("tavily"),
]);
export type WebSearchEngine = Static<typeof webSearchEngine>;

export const webSearchContextSize = t.Union([
  t.Literal("low"),
  t.Literal("medium"),
  t.Literal("high"),
]);
export type WebSearchContextSize = Static<typeof webSearchContextSize>;

const REASONING_EFFORTS: ReadonlySet<string> = new Set(
  unionLiterals(reasoningEffort),
);
const WEB_SEARCH_ENGINES: ReadonlySet<string> = new Set(
  unionLiterals(webSearchEngine),
);
const WEB_SEARCH_CONTEXT_SIZES: ReadonlySet<string> = new Set(
  unionLiterals(webSearchContextSize),
);

export function narrowReasoningEffort<TFallback extends string>(
  raw: string | null | undefined,
  fallback: TFallback,
): ReasoningEffort | TFallback {
  return raw && REASONING_EFFORTS.has(raw)
    ? (raw as ReasoningEffort)
    : fallback;
}
export function narrowWebSearchEngine(
  raw: string | null | undefined,
): WebSearchEngine {
  return raw && WEB_SEARCH_ENGINES.has(raw) ? (raw as WebSearchEngine) : "auto";
}
export function narrowWebSearchContextSize(
  raw: string | null | undefined,
): WebSearchContextSize {
  return raw && WEB_SEARCH_CONTEXT_SIZES.has(raw)
    ? (raw as WebSearchContextSize)
    : "medium";
}

export type ExtraBodyParse =
  | { state: "empty" }
  | { state: "valid"; parsed: Record<string, unknown> }
  | { state: "invalid" };

export function parseExtraBody(raw: string | null | undefined): ExtraBodyParse {
  if (!raw || raw.trim().length === 0) return { state: "empty" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { state: "valid", parsed: parsed as Record<string, unknown> };
    }
    return { state: "invalid" };
  } catch {
    return { state: "invalid" };
  }
}

export function formReasoningEffortToValue(
  raw: string | null | undefined,
): ReasoningEffort | null {
  if (!raw || raw === NONE_VALUE) return null;
  return REASONING_EFFORTS.has(raw) ? (raw as ReasoningEffort) : null;
}

export const streamOverrides = t.Object({
  reasoningEffort: t.Optional(t.Union([reasoningEffort, t.Null()])),
  chatMemory: t.Optional(
    t.Union([t.Number({ minimum: 1, maximum: 1000 }), t.Null()]),
  ),
  systemPromptOverride: t.Optional(
    t.Union([t.String({ maxLength: MAX_TEXT_LEN }), t.Null()]),
  ),
  authorNote: t.Optional(
    t.Union([t.String({ maxLength: MAX_TEXT_LEN }), t.Null()]),
  ),
  authorNoteDepth: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  webSearchEnabled: t.Optional(t.Boolean()),
  webSearchEngine: t.Optional(webSearchEngine),
  webSearchContextSize: t.Optional(webSearchContextSize),
  ...samplingOptional(),
  extraBody: t.Optional(t.Union([t.String({ maxLength: 8_192 }), t.Null()])),
  streamingEnabled: t.Optional(t.Union([t.Boolean(), t.Null()])),
  showReasoning: t.Optional(t.Union([t.Boolean(), t.Null()])),
});
export type StreamOverrides = Static<typeof streamOverrides>;

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
  chatMemory: t.Optional(
    t.Union([t.Number({ minimum: 1, maximum: 1000 }), t.Null()]),
  ),
  reasoningEffort: t.Optional(t.Union([reasoningEffort, t.Null()])),
  webSearchEnabled: t.Optional(t.Boolean()),
  webSearchEngine: t.Optional(webSearchEngine),
  webSearchContextSize: t.Optional(webSearchContextSize),
  group: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
  ...samplingOptional(),
  extraBody: t.Optional(t.Union([t.String({ maxLength: 8_192 }), t.Null()])),
  vars: t.Optional(t.Union([t.String({ maxLength: 65_536 }), t.Null()])),
  streamingEnabled: t.Optional(t.Union([t.Boolean(), t.Null()])),
  showReasoning: t.Optional(t.Union([t.Boolean(), t.Null()])),
  groupOrderByOrder: t.Optional(t.Union([t.Boolean(), t.Null()])),
  autoContinue: t.Optional(t.Union([t.Boolean(), t.Null()])),
  memoryEnabled: t.Optional(t.Union([t.Boolean(), t.Null()])),
  imageEnabled: t.Optional(t.Union([t.Boolean(), t.Null()])),
  utilityModel: t.Optional(
    t.Union([t.String({ maxLength: MAX_MODEL_LEN }), t.Null()]),
  ),
  promptInstruction: t.Optional(
    t.Union([t.String({ maxLength: 4_096 }), t.Null()]),
  ),
  imageModel: t.Optional(t.Union([t.String({ maxLength: 512 }), t.Null()])),
  imagePreview: t.Optional(t.Union([t.Boolean(), t.Null()])),
  imageRefIds: t.Optional(t.Union([t.String({ maxLength: 4_096 }), t.Null()])),
  useCharAvatarRef: t.Optional(t.Union([t.Boolean(), t.Null()])),
  summaryMemory: t.Optional(
    t.Union([t.String({ maxLength: 16_384 }), t.Null()]),
  ),
  summaryAnchor: t.Optional(t.Union([t.Number(), t.Null()])),
  firstMsgIndex: t.Optional(t.Number({ minimum: -1, maximum: 31 })),
});
export type UpdateConversationSettingsBody = Static<
  typeof updateConversationSettingsBody
>;

export type UpdateConversationBindingsBody = {
  characters?: Array<{
    characterId: string;
    orderIndex?: number;
    isActive?: boolean;
    overrides?: unknown;
  }>;
  lorebookIds?: string[];
};

export const chatContext = t.Object({
  persona: t.Optional(t.Union([t.Any(), t.Null()])),
  characters: t.Optional(
    t.Array(
      t.Object({
        binding: t.Object({
          characterId: t.String(),
          orderIndex: t.Optional(t.Union([t.Number(), t.Null()])),
          isActive: t.Optional(t.Union([t.Boolean(), t.Null()])),
          overrides: t.Optional(t.Unknown()),
        }),
        character: t.Any(),
      }),
      { maxItems: 64 },
    ),
  ),
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
  globalVars: t.Optional(t.Union([t.String(), t.Null()])),
});
export type ChatContext = Static<typeof chatContext>;

export const streamBody = t.Object({
  model: t.String({ maxLength: MAX_MODEL_LEN }),
  messages: t.Array(t.Any(), { maxItems: MAX_MESSAGES_PER_STREAM }),
  convId: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
  webSearch: t.Optional(t.Boolean()),
  group: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
  overrides: t.Optional(streamOverrides),
  chatContext: t.Optional(chatContext),
  globalVars: t.Optional(t.Union([t.String(), t.Null()])),
  speakingCharacterId: t.Optional(
    t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()]),
  ),
  messageTimes: t.Optional(t.Record(t.String(), t.Number())),
  clientEnv: t.Optional(
    t.Object({
      viewportW: t.Optional(t.Number()),
      viewportH: t.Optional(t.Number()),
      locale: t.Optional(t.String({ maxLength: 32 })),
      timeZone: t.Optional(t.String({ maxLength: 64 })),
    }),
  ),
});
export type StreamBody = Static<typeof streamBody>;

export const triggerLlmBody = t.Object({
  prompt: t.String({ maxLength: MAX_TEXT_LEN }),
  model: t.String({ maxLength: MAX_MODEL_LEN }),
});
export const triggerSimilarityBody = t.Object({
  source: t.String({ maxLength: MAX_TEXT_LEN }),
  values: t.Array(t.String({ maxLength: MAX_TEXT_LEN }), { maxItems: 256 }),
});
export const triggerImggenBody = t.Object({
  prompt: t.String({ maxLength: MAX_TEXT_LEN }),
  negative: t.Optional(t.String({ maxLength: MAX_TEXT_LEN })),
  model: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
  references: t.Optional(
    t.Array(t.Object({ url: t.String({ maxLength: 15_000_000 }) }), {
      maxItems: 6,
    }),
  ),
});

export const titleGenerationBody = t.Object({
  text: t.String({ maxLength: MAX_TITLE_SEED_LEN }),
  model: t.Optional(t.String()),
});

export const forwardBody = t.Object(
  {
    model: t.String({ maxLength: MAX_MODEL_LEN }),
    group: t.Optional(
      t.Union([t.String({ maxLength: MAX_MODEL_LEN }), t.Null()]),
    ),
  },
  { additionalProperties: true },
);

export const webSearchBody = t.Object({
  text: t.String({ maxLength: MAX_TEXT_LEN }),
});

export const finalizeTaskBody = t.Object({
  msgId: t.String({ maxLength: MAX_ID_LEN }),
  taskId: t.String({ maxLength: MAX_ID_LEN }),
  resultUrl: t.String({ maxLength: MAX_URL_LEN }),
});
export type FinalizeTaskBody = Static<typeof finalizeTaskBody>;
