// Mirrors `./rp.ts` and `./chat.ts` with `default:` for RHF's `Value.Default`.

import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg, NONE_VALUE, type TranslationKey } from "../config/constants";

// Single source of truth for every sampling knob. `field` is the camelCase
// app/DB name (form schema, Drizzle row, StreamOverrides). `apiKey` is the
// snake_case upstream OpenAI parameter name, matched against a model's
// `supportedParameters` capability list. The two vocabularies live in one row
// so they cannot drift; the slider UI also reads min/max/step/fallback here.
export const SAMPLING_PARAMS = [
  {
    field: "temperature",
    apiKey: "temperature",
    labelKey: "RP.SAMPLING_TEMPERATURE",
    min: 0,
    max: 2,
    fallback: 1,
  },
  {
    field: "topP",
    apiKey: "top_p",
    labelKey: "RP.SAMPLING_TOP_P",
    min: 0,
    max: 1,
    fallback: 1,
  },
  {
    field: "topK",
    apiKey: "top_k",
    labelKey: "RP.SAMPLING_TOP_K",
    min: 0,
    max: 200,
    step: 1,
    fallback: 0,
  },
  {
    field: "minP",
    apiKey: "min_p",
    labelKey: "RP.SAMPLING_MIN_P",
    min: 0,
    max: 1,
    fallback: 0,
  },
  {
    field: "topA",
    apiKey: "top_a",
    labelKey: "RP.SAMPLING_TOP_A",
    min: 0,
    max: 1,
    fallback: 0,
  },
  {
    field: "frequencyPenalty",
    apiKey: "frequency_penalty",
    labelKey: "RP.SAMPLING_FREQUENCY_PENALTY",
    min: -2,
    max: 2,
    fallback: 0,
  },
  {
    field: "presencePenalty",
    apiKey: "presence_penalty",
    labelKey: "RP.SAMPLING_PRESENCE_PENALTY",
    min: -2,
    max: 2,
    fallback: 0,
  },
  {
    field: "repetitionPenalty",
    apiKey: "repetition_penalty",
    labelKey: "RP.SAMPLING_REPETITION_PENALTY",
    min: 0,
    max: 2,
    fallback: 1,
  },
  {
    field: "maxTokens",
    apiKey: "max_tokens",
    labelKey: "RP.SAMPLING_MAX_TOKENS",
    min: 1,
    max: 32_000,
    step: 1,
    fallback: 2048,
  },
] as const satisfies ReadonlyArray<{
  field: string;
  apiKey: string;
  labelKey: TranslationKey;
  min: number;
  max: number;
  step?: number;
  fallback: number;
}>;

export type SamplingParam = (typeof SAMPLING_PARAMS)[number];

// Sampling slider field names, shared by the override form + its reset helper.
export type SamplingFieldName = SamplingParam["field"];
export const SAMPLING_FIELDS = SAMPLING_PARAMS.map(
  (p) => p.field,
) as SamplingFieldName[];

// RP entity tabs shown in the sidebar dialog + nav.
export const RP_TABS = ["characters", "personas", "lorebooks"] as const;
export type RpTab = (typeof RP_TABS)[number];

const reasoningEffortLiterals = [
  t.Literal(NONE_VALUE),
  t.Literal("xhigh"),
  t.Literal("high"),
  t.Literal("medium"),
  t.Literal("low"),
  t.Literal("minimal"),
  t.Literal("none"),
];

const webSearchEngineLiterals = [
  t.Literal("auto"),
  t.Literal("native"),
  t.Literal("exa"),
  t.Literal("tavily"),
];

const webSearchContextSizeLiterals = [
  t.Literal("low"),
  t.Literal("medium"),
  t.Literal("high"),
];

// Exported so the entry editor can both build its Select options and narrow
// the form's loose `string` position back to this union for the API body.
export const LOREBOOK_POSITIONS = [
  "before_char",
  "after_char",
  "top",
  "bottom",
  "at_depth",
] as const;
export type LorebookPosition = (typeof LOREBOOK_POSITIONS)[number];

export const LOREBOOK_INJECTION_ROLES = ["user", "system"] as const;
export type LorebookInjectionRole = (typeof LOREBOOK_INJECTION_ROLES)[number];

const lorebookPositionLiterals = LOREBOOK_POSITIONS.map((p) => t.Literal(p));
const lorebookInjectionRoleLiterals = LOREBOOK_INJECTION_ROLES.map((r) =>
  t.Literal(r),
);

const nullableNumber = (min: number, max: number) =>
  t.Union([t.Number({ minimum: min, maximum: max }), t.Null()], {
    default: null,
  });

export const conversationOverridesFormSchema = t.Object({
  personaId: t.String({ default: NONE_VALUE }),
  presetId: t.String({ default: NONE_VALUE }),
  reasoningEffort: t.Union(reasoningEffortLiterals, { default: NONE_VALUE }),
  chatMemory: t.Number({ minimum: 1, maximum: 1000, default: 8 }),
  authorNoteDepth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  systemPromptOverride: t.String({ default: "" }),
  authorNote: t.String({ default: "" }),
  webSearchEnabled: t.Boolean({ default: false }),
  webSearchEngine: t.Union(webSearchEngineLiterals, { default: "auto" }),
  webSearchContextSize: t.Union(webSearchContextSizeLiterals, {
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
  recursiveScanning: t.Boolean({ default: false }),
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
  position: t.Union(lorebookPositionLiterals, { default: "before_char" }),
  priority: t.Number({ minimum: 0, maximum: 1000, default: 100 }),
  depth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  constant: t.Boolean({ default: false }),
  selective: t.Boolean({ default: false }),
  enabled: t.Boolean({ default: true }),
  matchWholeWords: t.Boolean({ default: false }),
  injectionRole: t.Union(lorebookInjectionRoleLiterals, { default: "user" }),
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
  // Comma-separated keywords; assembler matches against recent user texts.
  triggers: t.String({ default: "" }),
  alwaysActive: t.Boolean({ default: true }),
  matchWholeWords: t.Boolean({ default: false }),
});
export type CharacterForm = Static<typeof characterFormSchema>;

export const cardFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: 200,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  description: t.String({ maxLength: 50_000, default: "" }),
  personaId: t.String({ default: NONE_VALUE }),
  characterIds: t.Array(t.String(), { default: [] }),
  lorebookIds: t.Array(t.String(), { default: [] }),
});
export type CardForm = Static<typeof cardFormSchema>;
