/**
 * Client-side TypeBox form schemas for the RP suite.
 *
 * The server validation lives in `./rp.ts` and `./chat.ts` (Elysia's `t`).
 * These mirror those shapes but add `default:` values so RHF's
 * `Value.Default(schema, {})` produces a fully-shaped initial form.
 */

import { TypeCompiler } from "@sinclair/typebox/compiler";
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

// ---------------------------------------------------------------------------
// Conversation overrides (drawer)
// ---------------------------------------------------------------------------

export const conversationOverridesFormSchema = t.Object({
  personaId: t.String({ default: "__none__" }),
  presetId: t.String({ default: "__none__" }),
  reasoningEffort: t.String({ ...reasoningEffortLiterals, default: "__none__" }),
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
  // Inline sampling overrides (null = use preset/model default).
  temperature: nullableNumber(0, 2),
  topP: nullableNumber(0, 1),
  topK: nullableNumber(0, 1000),
  minP: nullableNumber(0, 1),
  topA: nullableNumber(0, 1),
  frequencyPenalty: nullableNumber(-2, 2),
  presencePenalty: nullableNumber(-2, 2),
  repetitionPenalty: nullableNumber(0, 2),
  maxTokens: nullableNumber(1, 1_000_000),
});
export const conversationOverridesFormChecker = TypeCompiler.Compile(
  conversationOverridesFormSchema,
);
export type ConversationOverridesForm = Static<
  typeof conversationOverridesFormSchema
>;

// ---------------------------------------------------------------------------
// Sampling preset (preset-list dialog)
// ---------------------------------------------------------------------------

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
  isDefault: t.Boolean({ default: false }),
});
export const samplingPresetFormChecker = TypeCompiler.Compile(
  samplingPresetFormSchema,
);
export type SamplingPresetForm = Static<typeof samplingPresetFormSchema>;

// ---------------------------------------------------------------------------
// Persona
// ---------------------------------------------------------------------------

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
export const personaFormChecker = TypeCompiler.Compile(personaFormSchema);
export type PersonaForm = Static<typeof personaFormSchema>;

// ---------------------------------------------------------------------------
// Lorebook header
// ---------------------------------------------------------------------------

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
export const lorebookFormChecker = TypeCompiler.Compile(lorebookFormSchema);
export type LorebookForm = Static<typeof lorebookFormSchema>;

// ---------------------------------------------------------------------------
// Lorebook entry (entries are stored with array key fields, but the form
// edits them as comma-separated strings for ergonomics).
// ---------------------------------------------------------------------------

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
});
export const lorebookEntryFormChecker = TypeCompiler.Compile(
  lorebookEntryFormSchema,
);
export type LorebookEntryForm = Static<typeof lorebookEntryFormSchema>;

// ---------------------------------------------------------------------------
// Character
// ---------------------------------------------------------------------------

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
});
export const characterFormChecker = TypeCompiler.Compile(characterFormSchema);
export type CharacterForm = Static<typeof characterFormSchema>;
