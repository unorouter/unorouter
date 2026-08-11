import type { Static } from "elysia";
import { t } from "elysia";
import { nullable, samplingNullable } from "./helpers";
import { reasoningEffort } from "./chat";

export const MAX_NAME_LEN = 200;
export const MAX_DESC_LEN = 50_000;
export const MAX_TAG_LEN = 64;
export const MAX_TAGS = 32;
export const MAX_KEYS_PER_ENTRY = 64;
export const MAX_KEY_LEN = 200;

export const characterBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  avatarMediaId: nullable(t.String({ maxLength: 64 })),
  backgroundMediaId: nullable(t.String({ maxLength: 64 })),
  description: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  personality: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  scenario: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  firstMessage: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  alternateGreetings: nullable(
    t.Array(t.String({ maxLength: MAX_DESC_LEN }), { maxItems: 32 }),
  ),
  exampleMessages: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  systemPrompt: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  postHistoryInstructions: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  defaultReasoningEffort: nullable(reasoningEffort),
  tags: nullable(
    t.Array(t.String({ maxLength: MAX_TAG_LEN }), { maxItems: MAX_TAGS }),
  ),
  triggers: nullable(t.Array(t.Unknown(), { maxItems: 128 })),
  turnTriggers: nullable(
    t.Array(t.String({ maxLength: MAX_KEY_LEN }), {
      maxItems: MAX_KEYS_PER_ENTRY,
    }),
  ),
  regexScripts: nullable(t.Array(t.Unknown(), { maxItems: 128 })),
  alwaysActive: t.Boolean({ default: true }),
  matchWholeWords: t.Boolean({ default: false }),
});
export type CharacterBody = Static<typeof characterBody>;

export const personaBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  title: nullable(t.String({ maxLength: MAX_NAME_LEN })),
  description: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  avatarMediaId: nullable(t.String({ maxLength: 64 })),
  isDefault: t.Optional(t.Boolean()),
});
export type PersonaBody = Static<typeof personaBody>;

export const lorebookBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  description: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  scanDepth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  tokenBudget: t.Number({ minimum: 100, maximum: 1_000_000, default: 1500 }),
  recursiveScanning: t.Boolean({ default: false }),
});
export type LorebookBody = Static<typeof lorebookBody>;

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
  secondaryKeys: nullable(
    t.Array(t.String({ maxLength: MAX_KEY_LEN }), {
      maxItems: MAX_KEYS_PER_ENTRY,
    }),
  ),
  content: t.String({ minLength: 1, maxLength: MAX_DESC_LEN }),
  constant: t.Boolean({ default: false }),
  selective: t.Boolean({ default: false }),
  priority: t.Integer({ default: 100 }),
  orderIndex: t.Integer({ default: 0 }),
  enabled: t.Boolean({ default: true }),
  matchWholeWords: t.Boolean({ default: false }),
  injectionRole: t.Union(lorebookInjectionRole.anyOf, { default: "system" }),
});
export type LorebookEntryBody = Static<typeof lorebookEntryBody>;

export const samplingPresetBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  ...samplingNullable({ temperatureMax: 4 }),
  streamingEnabled: nullable(t.Boolean()),
  autoScrollStream: nullable(t.Boolean()),
  showReasoning: nullable(t.Boolean()),
  chatMemory: nullable(t.Number({ minimum: 1, maximum: 1000 })),
  extraBody: nullable(t.String({ maxLength: 8_192 })),
  providers: nullable(t.String({ maxLength: 4_096 })),
  promptTemplate: nullable(t.String({ maxLength: 32_768 })),
  mainPrompt: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  postHistory: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  postHistoryRole: nullable(t.Union([t.Literal("system"), t.Literal("user")])),
  prefill: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  forceAlternateRoles: t.Boolean({ default: false }),
  noSystemRole: t.Boolean({ default: false }),
  mustStartWithUserInput: t.Boolean({ default: false }),
  geminiBlockOff: t.Boolean({ default: false }),
  isDefault: t.Optional(t.Boolean()),
});
export type SamplingPresetBody = Static<typeof samplingPresetBody>;

const MAX_BUNDLE_ITEMS = 64;

export const cardBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  description: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  personaId: nullable(t.String({ maxLength: 64 })),
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
