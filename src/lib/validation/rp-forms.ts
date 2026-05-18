// Mirrors `./rp.ts` and `./chat.ts` with `default:` for RHF's `Value.Default`.

import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg } from "../config/constants";

const reasoningEffortLiterals = t.Union([
  t.Literal("__none__"),
  t.Literal("xhigh"),
  t.Literal("high"),
  t.Literal("medium"),
  t.Literal("low"),
  t.Literal("minimal"),
  t.Literal("none"),
]);

const webSearchEngineLiterals = t.Union([
  t.Literal("auto"),
  t.Literal("native"),
  t.Literal("exa"),
  t.Literal("tavily"),
]);

const webSearchContextSizeLiterals = t.Union([
  t.Literal("low"),
  t.Literal("medium"),
  t.Literal("high"),
]);

const lorebookPositionLiterals = t.Union([
  t.Literal("before_char"),
  t.Literal("after_char"),
  t.Literal("top"),
  t.Literal("bottom"),
  t.Literal("at_depth"),
]);

const nullableNumber = (min: number, max: number) =>
  t.Union([t.Number({ minimum: min, maximum: max }), t.Null()], {
    default: null,
  });

export const conversationOverridesFormSchema = t.Object({
  personaId: t.String({ default: "__none__" }),
  presetId: t.String({ default: "__none__" }),
  reasoningEffort: t.String({
    ...reasoningEffortLiterals,
    default: "__none__",
  }),
  chatMemory: t.Number({ minimum: 1, maximum: 1000, default: 8 }),
  authorNoteDepth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  systemPromptOverride: t.String({ default: "" }),
  authorNote: t.String({ default: "" }),
  webSearchEnabled: t.Boolean({ default: false }),
  webSearchEngine: t.String({
    ...webSearchEngineLiterals,
    default: "auto",
  }),
  webSearchContextSize: t.String({
    ...webSearchContextSizeLiterals,
    default: "medium",
  }),
  characterIds: t.Array(t.String(), { default: [] }),
  lorebookIds: t.Array(t.String(), { default: [] }),
  temperature: nullableNumber(0, 2),
  topP: nullableNumber(0, 1),
  topK: nullableNumber(0, 1000),
  minP: nullableNumber(0, 1),
  topA: nullableNumber(0, 1),
  frequencyPenalty: nullableNumber(-2, 2),
  presencePenalty: nullableNumber(-2, 2),
  repetitionPenalty: nullableNumber(0, 2),
  maxTokens: nullableNumber(1, 1_000_000),
  extraBody: t.String({ default: "", maxLength: 8_192 }),
  // false = BFF buffers full reply, then streams as one chunk.
  streamingEnabled: t.Boolean({ default: true }),
});
export type ConversationOverridesForm = Static<
  typeof conversationOverridesFormSchema
>;

export const samplingPresetFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: 200,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  temperature: nullableNumber(0, 4),
  topP: nullableNumber(0, 1),
  topK: nullableNumber(0, 1000),
  minP: nullableNumber(0, 1),
  topA: nullableNumber(0, 1),
  frequencyPenalty: nullableNumber(-2, 2),
  presencePenalty: nullableNumber(-2, 2),
  repetitionPenalty: nullableNumber(0, 2),
  maxTokens: nullableNumber(1, 1_000_000),
  mainPrompt: t.String({ default: "", maxLength: 50_000 }),
  postHistory: t.String({ default: "", maxLength: 50_000 }),
  prefill: t.String({ default: "", maxLength: 50_000 }),
  forceAlternateRoles: t.Boolean({ default: false }),
  noSystemRole: t.Boolean({ default: false }),
  mustStartWithUserInput: t.Boolean({ default: false }),
  skipPrefillIfLastIsAssistant: t.Boolean({ default: false }),
  geminiBlockOff: t.Boolean({ default: false }),
  isDefault: t.Boolean({ default: false }),
});
export type SamplingPresetForm = Static<typeof samplingPresetFormSchema>;

export const personaFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: 200,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  description: t.String({ maxLength: 50_000, default: "" }),
  isDefault: t.Boolean({ default: false }),
});
export type PersonaForm = Static<typeof personaFormSchema>;

export const lorebookFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: 200,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  description: t.String({ maxLength: 50_000, default: "" }),
  scanDepth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  tokenBudget: t.Number({ minimum: 100, maximum: 32_000, default: 1500 }),
});
export type LorebookForm = Static<typeof lorebookFormSchema>;

// Keys stored as arrays; form edits as comma-separated strings.
export const lorebookEntryFormSchema = t.Object({
  keys: t.String({ default: "" }),
  secondaryKeys: t.String({ default: "" }),
  content: t.String({
    minLength: 1,
    maxLength: 50_000,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  position: t.String({
    ...lorebookPositionLiterals,
    default: "before_char",
  }),
  priority: t.Number({ minimum: 0, maximum: 1000, default: 100 }),
  depth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  constant: t.Boolean({ default: false }),
  selective: t.Boolean({ default: false }),
  enabled: t.Boolean({ default: true }),
  matchWholeWords: t.Boolean({ default: false }),
  injectionRole: t.String({
    enum: ["system", "user"],
    default: "user",
  }),
});
export type LorebookEntryForm = Static<typeof lorebookEntryFormSchema>;

export const characterFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: 200,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  description: t.String({ maxLength: 50_000, default: "" }),
  personality: t.String({ maxLength: 50_000, default: "" }),
  scenario: t.String({ maxLength: 50_000, default: "" }),
  firstMessage: t.String({ maxLength: 50_000, default: "" }),
  exampleMessages: t.String({ maxLength: 50_000, default: "" }),
  systemPrompt: t.String({ maxLength: 50_000, default: "" }),
  postHistoryInstructions: t.String({ maxLength: 50_000, default: "" }),
  tags: t.String({ default: "" }),
  nsfw: t.Boolean({ default: false }),
  // Comma-separated keywords; assembler matches against recent user texts.
  triggers: t.String({ default: "" }),
  alwaysActive: t.Boolean({ default: true }),
  matchWholeWords: t.Boolean({ default: false }),
});
export type CharacterForm = Static<typeof characterFormSchema>;
