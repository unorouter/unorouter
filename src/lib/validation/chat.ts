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

// One union member per item type; data schema is the only variance.
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

// Runtime schema kept for future server validation.
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

// Source of truth for validation + schema column narrows.
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

// Typed as ReadonlySet<string> so membership checks take a bare string with no
// cast; the narrowing return then casts once (TS can't infer through Set.has).
const REASONING_EFFORTS: ReadonlySet<string> = new Set(
  unionLiterals(reasoningEffort),
);
const WEB_SEARCH_ENGINES: ReadonlySet<string> = new Set(
  unionLiterals(webSearchEngine),
);
const WEB_SEARCH_CONTEXT_SIZES: ReadonlySet<string> = new Set(
  unionLiterals(webSearchContextSize),
);

// Narrow bare text from SQLocal / cookies into the literal union; fall back on unknown.
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

// extraBody JSON: UI reads `valid`; stream uses `parsed`.
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

// Form uses `NONE_VALUE` sentinel for "model default"; collapse to null.
export function formReasoningEffortToValue(
  raw: string | null | undefined,
): ReasoningEffort | null {
  if (!raw || raw === NONE_VALUE) return null;
  return REASONING_EFFORTS.has(raw) ? (raw as ReasoningEffort) : null;
}

// Keep in sync with `chatDefaultsAtom` in `src/store/chat-store.ts`.
export const streamOverrides = t.Object({
  reasoningEffort: t.Optional(t.Union([reasoningEffort, t.Null()])),
  // null = inherit the bound preset (else system default 8).
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
  // Sliders win on key conflicts. Parsed at the prompt assembler.
  extraBody: t.Optional(t.Union([t.String({ maxLength: 8_192 }), t.Null()])),
  // null = inherit the bound preset (else system default: streaming on). false =
  // BFF buffers full upstream reply, then emits one chunk.
  streamingEnabled: t.Optional(t.Union([t.Boolean(), t.Null()])),
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
  // Billing/routing group sent upstream as X-Group; null == "auto".
  group: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
  ...samplingOptional(),
  extraBody: t.Optional(t.Union([t.String({ maxLength: 8_192 }), t.Null()])),
  // Chat-variable store (macro setvar + sticky lorebook state). Must sync or a
  // cross-device hydration wipes setvar/sticky state.
  vars: t.Optional(t.Union([t.String({ maxLength: 65_536 }), t.Null()])),
  streamingEnabled: t.Optional(t.Union([t.Boolean(), t.Null()])),
  groupOrderByOrder: t.Optional(t.Union([t.Boolean(), t.Null()])),
  autoContinue: t.Optional(t.Union([t.Boolean(), t.Null()])),
  memoryEnabled: t.Optional(t.Union([t.Boolean(), t.Null()])),
  summaryMemory: t.Optional(
    t.Union([t.String({ maxLength: 16_384 }), t.Null()]),
  ),
  summaryAnchor: t.Optional(t.Union([t.Number(), t.Null()])),
  firstMsgIndex: t.Optional(t.Number({ minimum: -1, maximum: 31 })),
});
export type UpdateConversationSettingsBody = Static<
  typeof updateConversationSettingsBody
>;

// Plain type: bindings mutate local-first only, this shape never crosses a wire.
export type UpdateConversationBindingsBody = {
  characters?: Array<{
    characterId: string;
    orderIndex?: number;
    isActive?: boolean;
    overrides?: unknown;
  }>;
  lorebookIds?: string[];
};

// Loose `Any()`: each entity body has its own validation surface; re-checking
// here would double-cost on every turn.
export const chatContext = t.Object({
  persona: t.Optional(t.Union([t.Any(), t.Null()])),
  // Bound shape only: `{binding, character}` (the client always sends it; the
  // assembler honors per-character isActive/overrides through the binding).
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
  // Per-user global variable store (JSON string) for setglobalvar/getglobalvar.
  globalVars: t.Optional(t.Union([t.String(), t.Null()])),
});
export type ChatContext = Static<typeof chatContext>;

export const streamBody = t.Object({
  model: t.String({ maxLength: MAX_MODEL_LEN }),
  messages: t.Array(t.Any(), { maxItems: MAX_MESSAGES_PER_STREAM }),
  convId: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
  webSearch: t.Optional(t.Boolean()),
  // Billing/routing group sent upstream as X-Group; null/absent == "auto".
  group: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
  // Fallback for guest convs (no settings row).
  overrides: t.Optional(streamOverrides),
  chatContext: t.Optional(chatContext),
  // Content fingerprint of chatContext (sans globalVars). When the server's
  // per-conv context cache holds this hash, the client omits chatContext
  // entirely; a miss answers 409 context-required and the client retries full.
  chatContextHash: t.Optional(t.String({ maxLength: 64 })),
  // Always-sent (small, changes often); rides outside the hashed context.
  globalVars: t.Optional(t.Union([t.String(), t.Null()])),
  // Multi-character rotation: which bound character speaks this turn. When set,
  // the assembler promotes that character to primary (drives {{char}}).
  speakingCharacterId: t.Optional(
    t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()]),
  ),
  // Per-message createdAt (unix ms) keyed by message id, for the CBS
  // message_time/date/idle family. Outside the hashed context: changes per turn.
  messageTimes: t.Optional(t.Record(t.String(), t.Number())),
  // Browser environment for screen_width/height + locale-faithful time macros.
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

// V1 lowLevelAccess trigger effects from client modes (runLLM/checkSimilarity/
// runImgGen): keys resolve server-side, results return to the VM.
// One body per trigger op so each endpoint carries a single concrete request +
// response type (the client then needs no cast off a merged union).
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
});

export const titleGenerationBody = t.Object({
  text: t.String({ maxLength: MAX_TITLE_SEED_LEN }),
  model: t.Optional(t.String()),
});

export const finalizeTaskBody = t.Object({
  msgId: t.String({ maxLength: MAX_ID_LEN }),
  taskId: t.String({ maxLength: MAX_ID_LEN }),
  resultUrl: t.String({ maxLength: MAX_URL_LEN }),
});
export type FinalizeTaskBody = Static<typeof finalizeTaskBody>;
