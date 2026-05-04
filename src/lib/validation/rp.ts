import type { Static } from "elysia";
import { t } from "elysia";
import { reasoningEffort } from "./chat";

const MAX_ID_LEN = 64;
const MAX_NAME_LEN = 200;
const MAX_DESC_LEN = 50_000;
const MAX_MODEL_LEN = 128;
const MAX_TAG_LEN = 64;
const MAX_TAGS = 32;
const MAX_KEYS_PER_ENTRY = 64;
const MAX_KEY_LEN = 200;

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

export const characterBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  shortName: t.Optional(t.String({ maxLength: MAX_NAME_LEN })),
  avatarR2Key: t.Optional(t.Union([t.String({ maxLength: 512 }), t.Null()])),
  description: t.Optional(t.String({ maxLength: MAX_DESC_LEN })),
  personality: t.Optional(t.String({ maxLength: MAX_DESC_LEN })),
  scenario: t.Optional(t.String({ maxLength: MAX_DESC_LEN })),
  firstMessage: t.Optional(t.String({ maxLength: MAX_DESC_LEN })),
  exampleMessages: t.Optional(t.String({ maxLength: MAX_DESC_LEN })),
  systemPrompt: t.Optional(t.String({ maxLength: MAX_DESC_LEN })),
  postHistoryInstructions: t.Optional(t.String({ maxLength: MAX_DESC_LEN })),
  defaultModel: t.Optional(t.String({ maxLength: MAX_MODEL_LEN })),
  defaultPresetId: t.Optional(
    t.Union([t.String({ maxLength: MAX_ID_LEN }), t.Null()]),
  ),
  defaultReasoningEffort: t.Optional(t.Union([reasoningEffort, t.Null()])),
  tags: t.Optional(
    t.Array(t.String({ maxLength: MAX_TAG_LEN }), { maxItems: MAX_TAGS }),
  ),
  source: t.Optional(t.String({ maxLength: 32 })),
  sourceId: t.Optional(t.String({ maxLength: 256 })),
  nsfw: t.Optional(t.Boolean()),
});
export type CharacterBody = Static<typeof characterBody>;

export const characterCardImportBody = t.Object({
  file: t.File({
    type: ["image/png", "image/webp", "application/json"],
    maxSize: "10m",
  }),
});
export type CharacterCardImportBody = Static<typeof characterCardImportBody>;

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export const personaBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  description: t.Optional(t.String({ maxLength: MAX_DESC_LEN })),
  avatarR2Key: t.Optional(t.Union([t.String({ maxLength: 512 }), t.Null()])),
  isDefault: t.Optional(t.Boolean()),
});
export type PersonaBody = Static<typeof personaBody>;

// ---------------------------------------------------------------------------
// Lorebooks + entries
// ---------------------------------------------------------------------------

export const lorebookBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  description: t.Optional(t.String({ maxLength: MAX_DESC_LEN })),
  scanDepth: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  tokenBudget: t.Optional(t.Number({ minimum: 100, maximum: 32_000 })),
  recursiveScanning: t.Optional(t.Boolean()),
});
export type LorebookBody = Static<typeof lorebookBody>;

export const lorebookEntryPosition = t.Union([
  t.Literal("before_char"),
  t.Literal("after_char"),
  t.Literal("top"),
  t.Literal("bottom"),
  t.Literal("at_depth"),
]);
export type LorebookEntryPosition = Static<typeof lorebookEntryPosition>;

export const lorebookEntryBody = t.Object({
  keys: t.Array(t.String({ maxLength: MAX_KEY_LEN }), {
    maxItems: MAX_KEYS_PER_ENTRY,
  }),
  secondaryKeys: t.Optional(
    t.Array(t.String({ maxLength: MAX_KEY_LEN }), {
      maxItems: MAX_KEYS_PER_ENTRY,
    }),
  ),
  content: t.String({ minLength: 1, maxLength: MAX_DESC_LEN }),
  constant: t.Optional(t.Boolean()),
  selective: t.Optional(t.Boolean()),
  priority: t.Optional(t.Number({ minimum: 0, maximum: 1000 })),
  position: t.Optional(lorebookEntryPosition),
  depth: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  enabled: t.Optional(t.Boolean()),
  orderIndex: t.Optional(t.Number()),
});
export type LorebookEntryBody = Static<typeof lorebookEntryBody>;

// ---------------------------------------------------------------------------
// Sampling presets
// ---------------------------------------------------------------------------

export const samplingPresetBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  temperature: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 4 }), t.Null()])),
  topP: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()])),
  topK: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 1000 }), t.Null()])),
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
  maxTokens: t.Optional(t.Union([t.Number({ minimum: 1 }), t.Null()])),
  isDefault: t.Optional(t.Boolean()),
});
export type SamplingPresetBody = Static<typeof samplingPresetBody>;

// ---------------------------------------------------------------------------
// Import (full conversation: native or orpg.3.0)
// ---------------------------------------------------------------------------

export const importConversationBody = t.Object({
  file: t.File({
    type: ["application/json", "text/json"],
    maxSize: "20m",
  }),
});
export type ImportConversationBody = Static<typeof importConversationBody>;

export const exportFormat = t.Union([
  t.Literal("native"),
  t.Literal("orpg"),
]);
export type ExportFormat = Static<typeof exportFormat>;

export const exportQuery = t.Object({
  format: t.Optional(exportFormat),
});
