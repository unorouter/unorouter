import type { Static } from "elysia";
import { t } from "elysia";
import { reasoningEffort } from "./chat";

const MAX_NAME_LEN = 200;
const MAX_DESC_LEN = 50_000;
const MAX_TAG_LEN = 64;
const MAX_TAGS = 32;
const MAX_KEYS_PER_ENTRY = 64;
const MAX_KEY_LEN = 200;

export const characterBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  avatarMediaId: t.Union([t.String({ maxLength: 64 }), t.Null()], {
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
  nsfw: t.Boolean({ default: false }),
  triggers: t.Union(
    [
      t.Array(t.String({ maxLength: MAX_KEY_LEN }), {
        maxItems: MAX_KEYS_PER_ENTRY,
      }),
      t.Null(),
    ],
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
  // isDefault stays optional+undefined — sibling-row reset transaction
  // ([persona.service.ts]) reads undefined-vs-false to gate the reset.
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

export const lorebookEntryPosition = t.Union([
  t.Literal("before_char"),
  t.Literal("after_char"),
  t.Literal("top"),
  t.Literal("bottom"),
  t.Literal("at_depth"),
]);

export const lorebookInjectionRole = t.Union([
  t.Literal("system"),
  t.Literal("user"),
]);

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
  position: t.Union(
    [
      t.Literal("before_char"),
      t.Literal("after_char"),
      t.Literal("top"),
      t.Literal("bottom"),
      t.Literal("at_depth"),
    ],
    { default: "before_char" },
  ),
  depth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  enabled: t.Boolean({ default: true }),
  orderIndex: t.Number({ default: 0 }),
  matchWholeWords: t.Boolean({ default: false }),
  injectionRole: t.Union([t.Literal("system"), t.Literal("user")], {
    default: "user",
  }),
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
  extraBody: t.Union([t.String({ maxLength: 8_192 }), t.Null()], {
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
  skipPrefillIfLastIsAssistant: t.Boolean({ default: false }),
  geminiBlockOff: t.Boolean({ default: false }),
  // isDefault stays optional+undefined — sibling-row reset transaction
  // ([preset.service.ts]) reads undefined-vs-false to gate the reset.
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

export const cardApplyBody = t.Object({
  convId: t.String({ maxLength: 64 }),
  mode: t.Union([t.Literal("replace"), t.Literal("merge")]),
});
export type CardApplyBody = Static<typeof cardApplyBody>;

export const importConversationBody = t.Object({
  file: t.File({
    maxSize: "20m",
  }),
});

export const exportFormat = t.Union([
  t.Literal("native"),
  t.Literal("orpg"),
  t.Literal("sillytavern"),
]);

export type ExportFormat = Static<typeof exportFormat>;

export const exportQuery = t.Object({
  format: t.Optional(exportFormat),
});

export const characterExportFormat = t.Union([
  t.Literal("png"),
  t.Literal("charx"),
  t.Literal("voxta"),
  t.Literal("json"),
]);

export type CharacterExportFormat = Static<typeof characterExportFormat>;

export const characterExportQuery = t.Object({
  format: t.Optional(characterExportFormat),
});

export const lorebookExportFormat = t.Union([
  t.Literal("sillytavern"),
  t.Literal("agnai"),
  t.Literal("risu"),
  t.Literal("ccv3"),
]);

export type LorebookExportFormat = Static<typeof lorebookExportFormat>;

export const lorebookExportQuery = t.Object({
  format: t.Optional(lorebookExportFormat),
});
