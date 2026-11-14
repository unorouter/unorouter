import { NONE_VALUE } from "@/lib/config/constants";
import { AIR_PATTERN } from "@/lib/ai/image/constants";
import { isOneOf, isRecord } from "@/lib/utils/base";
import type { ConversationRow } from "@/lib/db/schema/rows";
import type { Static } from "elysia";
import { t } from "elysia";
import { unionLiterals } from "./helpers";

const MAX_ID_LEN = 64;
// Exported for the same reason as MAX_TITLE_SEED_LEN below: a sender that
// builds a prompt out of chat history has to stop short of it, or a long
// roleplay 422s here and the feature reads as permanently broken.
export const MAX_TEXT_LEN = 100_000;
const MAX_MODEL_LEN = 128;
const MAX_URL_LEN = 2048;
// Exported: the sender truncates to it. A first message longer than this used
// to be posted whole and 422'd, so pasting a script meant the chat silently
// never got a title.
export const MAX_TITLE_SEED_LEN = 10_000;
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

export type MessageRole = "system" | "user" | "assistant";

const MESSAGE_ITEM_TYPES = [
  "text",
  "reasoning",
  "tool_call",
  "tool_result",
  "file",
  "image",
  "task",
  "error",
] as const;
export type MessageItemType = (typeof MESSAGE_ITEM_TYPES)[number];
export const isMessageItemType = isOneOf(MESSAGE_ITEM_TYPES);

export const reasoningEffort = t.Union([
  t.Literal("max"),
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

const REASONING_EFFORTS = unionLiterals(reasoningEffort);
const WEB_SEARCH_ENGINES = unionLiterals(webSearchEngine);
const WEB_SEARCH_CONTEXT_SIZES = unionLiterals(webSearchContextSize);

export function narrowReasoningEffort<TFallback extends string>(
  raw: string | null | undefined,
  fallback: TFallback,
): ReasoningEffort | TFallback {
  return REASONING_EFFORTS.find((v) => v === raw) ?? fallback;
}
export function narrowWebSearchEngine(
  raw: string | null | undefined,
): WebSearchEngine {
  return WEB_SEARCH_ENGINES.find((v) => v === raw) ?? "auto";
}
export function narrowWebSearchContextSize(
  raw: string | null | undefined,
): WebSearchContextSize {
  return WEB_SEARCH_CONTEXT_SIZES.find((v) => v === raw) ?? "medium";
}

type ExtraBodyParse =
  | { state: "empty" }
  | { state: "valid"; parsed: Record<string, unknown> }
  | { state: "invalid" };

export function parseExtraBody(raw: string | null | undefined): ExtraBodyParse {
  if (!raw || raw.trim().length === 0) return { state: "empty" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed)) {
      return { state: "valid", parsed };
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
  return REASONING_EFFORTS.find((v) => v === raw) ?? null;
}

// Also new-chat defaults, so a fresh chat can be set up before its first send.
export type StreamOverrides = Partial<
  Pick<
    ConversationRow,
    | "reasoningEffort"
    | "chatMemory"
    | "contextTokens"
    | "systemPromptOverride"
    | "authorNote"
    | "authorNoteDepth"
    | "webSearchEnabled"
    | "webSearchEngine"
    | "webSearchContextSize"
    | "temperature"
    | "topP"
    | "topK"
    | "minP"
    | "topA"
    | "frequencyPenalty"
    | "presencePenalty"
    | "repetitionPenalty"
    | "maxTokens"
    | "extraBody"
    | "streamingEnabled"
    | "autoScrollStream"
    | "showReasoning"
    | "memoryEnabled"
    | "imageEnabled"
    | "voiceEnabled"
    | "utilityModel"
    | "titleModel"
    | "titlePrompt"
    | "promptInstruction"
    | "imageModel"
    | "imagePreview"
    | "useCharAvatarRef"
  >
>;

export type UpdateConversationSettingsBody = Partial<
  Omit<ConversationRow, "id" | "createdAt" | "updatedAt">
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

export const streamBody = t.Object({
  model: t.String({ maxLength: MAX_MODEL_LEN }),
  messages: t.Array(t.Any(), { maxItems: MAX_MESSAGES_PER_STREAM }),
  convId: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
  group: t.Optional(t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()])),
});

export const triggerLlmBody = t.Object({
  prompt: t.String({ maxLength: MAX_TEXT_LEN }),
  model: t.String({ maxLength: MAX_MODEL_LEN }),
  group: t.Optional(t.String({ maxLength: 128 })),
});
export const triggerSimilarityBody = t.Object({
  source: t.String({ maxLength: MAX_TEXT_LEN }),
  values: t.Array(t.String({ maxLength: MAX_TEXT_LEN }), { maxItems: 256 }),
});
export const triggerImggenBody = t.Object({
  prompt: t.String({ maxLength: MAX_TEXT_LEN }),
  negative: t.Optional(t.String({ maxLength: MAX_TEXT_LEN })),
  model: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
  group: t.Optional(t.String({ maxLength: 128 })),
  air: t.Optional(t.String({ pattern: AIR_PATTERN.source, maxLength: 128 })),
  references: t.Optional(
    t.Array(t.Object({ url: t.String({ maxLength: 15_000_000 }) }), {
      maxItems: 6,
    }),
  ),
});
export const triggerImgTaskBody = t.Object({
  prompt: t.String({ maxLength: MAX_TEXT_LEN }),
  model: t.String({ maxLength: MAX_MODEL_LEN }),
  group: t.Optional(t.String({ maxLength: 128 })),
});

export const titleGenerationBody = t.Object({
  text: t.String({ maxLength: MAX_TITLE_SEED_LEN }),
  // The chat model, sent so a guest cannot title with a paid one. Distinct from
  // titleModel, which is what actually generates the title.
  model: t.Optional(t.String()),
  titleModel: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
  titleGroup: t.Optional(t.String({ maxLength: 128 })),
  titlePrompt: t.Optional(t.String({ maxLength: 4_096 })),
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
  taskId: t.String({ pattern: "^[A-Za-z0-9_-]{1,128}$" }),
});

// Spliced unencoded into the gateway path: "/" or "." would reach other routes.
export const taskIdParams = t.Object({
  taskId: t.String({ pattern: "^[A-Za-z0-9_-]{1,128}$" }),
});
