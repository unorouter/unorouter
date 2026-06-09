import type { Static } from "elysia";
import { t } from "elysia";
import { reasoningEffort } from "./chat";

export const MAX_NAME_LEN = 200;
export const MAX_DESC_LEN = 50_000;
export const MAX_TAG_LEN = 64;
export const MAX_TAGS = 32;
export const MAX_KEYS_PER_ENTRY = 64;
export const MAX_KEY_LEN = 200;

export const characterBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  avatarMediaId: t.Union([t.String({ maxLength: 64 }), t.Null()], {
    default: null,
  }),
  backgroundMediaId: t.Union([t.String({ maxLength: 64 }), t.Null()], {
    default: null,
  }),
  description: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  personality: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  scenario: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  firstMessage: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  exampleMessages: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  systemPrompt: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  postHistoryInstructions: t.Union(
    [t.String({ maxLength: MAX_DESC_LEN }), t.Null()],
    { default: null },
  ),
  defaultReasoningEffort: t.Union([reasoningEffort, t.Null()], {
    default: null,
  }),
  tags: t.Union(
    [
      t.Array(t.String({ maxLength: MAX_TAG_LEN }), { maxItems: MAX_TAGS }),
      t.Null(),
    ],
    { default: null },
  ),
  // RisuAI triggerscript[] (V2 effect VM). Loose: the VM parser narrows.
  triggers: t.Union(
    [t.Array(t.Unknown(), { maxItems: 128 }), t.Null()],
    { default: null },
  ),
  // Keyword array for multi-character turn-gating.
  turnTriggers: t.Union(
    [
      t.Array(t.String({ maxLength: MAX_KEY_LEN }), {
        maxItems: MAX_KEYS_PER_ENTRY,
      }),
      t.Null(),
    ],
    { default: null },
  ),
  // RisuAI customscript / ST regex scripts. Loose: the engine's parser narrows.
  regexScripts: t.Union(
    [t.Array(t.Unknown(), { maxItems: 128 }), t.Null()],
    { default: null },
  ),
  alwaysActive: t.Boolean({ default: true }),
  matchWholeWords: t.Boolean({ default: false }),
});
export type CharacterBody = Static<typeof characterBody>;

export const personaBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  description: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  avatarMediaId: t.Union([t.String({ maxLength: 64 }), t.Null()], {
    default: null,
  }),
  // Optional undefined; reset tx gates on undefined vs false.
  isDefault: t.Optional(t.Boolean()),
});
export type PersonaBody = Static<typeof personaBody>;

export const lorebookBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  description: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  scanDepth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  tokenBudget: t.Number({ minimum: 100, maximum: 32_000, default: 1500 }),
  recursiveScanning: t.Boolean({ default: false }),
});
export type LorebookBody = Static<typeof lorebookBody>;

export const LOREBOOK_POSITIONS = [
  "before_char",
  "after_char",
  "top",
  "bottom",
  "at_depth",
] as const;
export type LorebookEntryPosition = (typeof LOREBOOK_POSITIONS)[number];
export const lorebookEntryPosition = t.Union(
  LOREBOOK_POSITIONS.map((p) => t.Literal(p)),
);

export const LOREBOOK_INJECTION_ROLES = [
  "user",
  "system",
  "assistant",
] as const;
export type LorebookInjectionRole = (typeof LOREBOOK_INJECTION_ROLES)[number];
export const lorebookInjectionRole = t.Union(
  LOREBOOK_INJECTION_ROLES.map((r) => t.Literal(r)),
);

export const lorebookEntryBody = t.Object({
  keys: t.Array(t.String({ maxLength: MAX_KEY_LEN }), {
    maxItems: MAX_KEYS_PER_ENTRY,
  }),
  secondaryKeys: t.Union(
    [
      t.Array(t.String({ maxLength: MAX_KEY_LEN }), {
        maxItems: MAX_KEYS_PER_ENTRY,
      }),
      t.Null(),
    ],
    { default: null },
  ),
  content: t.String({ minLength: 1, maxLength: MAX_DESC_LEN }),
  constant: t.Boolean({ default: false }),
  selective: t.Boolean({ default: false }),
  priority: t.Number({ minimum: 0, maximum: 1000, default: 100 }),
  position: t.Union(lorebookEntryPosition.anyOf, { default: "before_char" }),
  depth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  enabled: t.Boolean({ default: true }),
  // Owned by create/update/reorder hooks (Risu insertorder), not the form.
  orderIndex: t.Optional(t.Number()),
  matchWholeWords: t.Boolean({ default: false }),
  injectionRole: t.Union(lorebookInjectionRole.anyOf, { default: "system" }),
});
export type LorebookEntryBody = Static<typeof lorebookEntryBody>;

export const samplingPresetBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  temperature: t.Union([t.Number({ minimum: 0, maximum: 4 }), t.Null()], {
    default: null,
  }),
  topP: t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()], {
    default: null,
  }),
  topK: t.Union([t.Number({ minimum: 0, maximum: 1000 }), t.Null()], {
    default: null,
  }),
  minP: t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()], {
    default: null,
  }),
  topA: t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()], {
    default: null,
  }),
  frequencyPenalty: t.Union([t.Number({ minimum: -2, maximum: 2 }), t.Null()], {
    default: null,
  }),
  presencePenalty: t.Union([t.Number({ minimum: -2, maximum: 2 }), t.Null()], {
    default: null,
  }),
  repetitionPenalty: t.Union([t.Number({ minimum: 0, maximum: 2 }), t.Null()], {
    default: null,
  }),
  maxTokens: t.Union([t.Number({ minimum: 1 }), t.Null()], { default: null }),
  // Preset-level defaults the conversation overrides per chat. null = system
  // default (streaming on, chatMemory 8).
  streamingEnabled: t.Union([t.Boolean(), t.Null()], { default: null }),
  chatMemory: t.Union([t.Number({ minimum: 1, maximum: 1000 }), t.Null()], {
    default: null,
  }),
  extraBody: t.Union([t.String({ maxLength: 8_192 }), t.Null()], {
    default: null,
  }),
  providers: t.Union([t.String({ maxLength: 4_096 }), t.Null()], {
    default: null,
  }),
  promptTemplate: t.Union([t.String({ maxLength: 32_768 }), t.Null()], {
    default: null,
  }),
  mainPrompt: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  postHistory: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  prefill: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  forceAlternateRoles: t.Boolean({ default: false }),
  noSystemRole: t.Boolean({ default: false }),
  mustStartWithUserInput: t.Boolean({ default: false }),
  geminiBlockOff: t.Boolean({ default: false }),
  // Optional undefined; reset tx gates on undefined vs false.
  isDefault: t.Optional(t.Boolean()),
});
export type SamplingPresetBody = Static<typeof samplingPresetBody>;

const MAX_BUNDLE_ITEMS = 64;

export const cardBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  description: t.Union([t.String({ maxLength: MAX_DESC_LEN }), t.Null()], {
    default: null,
  }),
  personaId: t.Union([t.String({ maxLength: 64 }), t.Null()], {
    default: null,
  }),
  characterIds: t.Array(t.String({ maxLength: 64 }), {
    maxItems: MAX_BUNDLE_ITEMS,
    default: [],
  }),
  lorebookIds: t.Array(t.String({ maxLength: 64 }), {
    maxItems: MAX_BUNDLE_ITEMS,
    default: [],
  }),
});
export type CardBody = Static<typeof cardBody>;

export const cardApplyMode = t.Union([
  t.Literal("replace"),
  t.Literal("merge"),
]);
export type CardApplyMode = Static<typeof cardApplyMode>;

export const exportFormat = t.Union([
  t.Literal("native"),
  t.Literal("orpg"),
  t.Literal("sillytavern"),
]);

export type ExportFormat = Static<typeof exportFormat>;

// JSON-envelope formats only; sillytavern is JSONL via a separate path.
export const conversationExportFormat = t.Union([
  t.Literal("native"),
  t.Literal("orpg"),
]);

export type ConversationExportFormat = Static<typeof conversationExportFormat>;

export const characterExportFormat = t.Union([
  t.Literal("png"),
  t.Literal("charx"),
  t.Literal("voxta"),
  t.Literal("json"),
]);

export type CharacterExportFormat = Static<typeof characterExportFormat>;

export const lorebookExportFormat = t.Union([
  t.Literal("sillytavern"),
  t.Literal("agnai"),
  t.Literal("risu"),
  t.Literal("ccv3"),
]);

export type LorebookExportFormat = Static<typeof lorebookExportFormat>;
