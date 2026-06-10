// Mirrors `./rp.ts` and `./chat.ts` with `default:` for RHF's `Value.Default`.

import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg, NONE_VALUE, type TranslationKey } from "../config/constants";
import {
  LOREBOOK_INJECTION_ROLES,
  LOREBOOK_POSITIONS,
  MAX_DESC_LEN,
  MAX_NAME_LEN,
  type LorebookEntryPosition,
  type LorebookInjectionRole,
} from "./rp";
export {
  LOREBOOK_INJECTION_ROLES,
  LOREBOOK_POSITIONS,
  type LorebookEntryPosition as LorebookPosition,
  type LorebookInjectionRole,
};

// Single source for sampling knobs. `field`=camelCase DB;
// `apiKey`=snake_case upstream.
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
  // null = inherit the bound preset's chatMemory (else system default 8).
  chatMemory: nullableNumber(1, 1000),
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
  // null = inherit the bound preset (else system default: streaming on). false =
  // BFF buffers full reply, then streams as one chunk.
  streamingEnabled: t.Union([t.Boolean(), t.Null()], { default: null }),
});
export type ConversationOverridesForm = Static<
  typeof conversationOverridesFormSchema
>;

export const samplingPresetFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: MAX_NAME_LEN,
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
  // Preset-level defaults (the conversation overrides per chat). null = system
  // default (streaming on, chatMemory 8).
  streamingEnabled: t.Union([t.Boolean(), t.Null()], { default: null }),
  chatMemory: nullableNumber(1, 1000),
  mainPrompt: t.String({ default: "", maxLength: MAX_DESC_LEN }),
  postHistory: t.String({ default: "", maxLength: MAX_DESC_LEN }),
  prefill: t.String({ default: "", maxLength: MAX_DESC_LEN }),
  // Comma-separated provider slugs; serialized to the `providers` JSON on submit.
  providers: t.String({ default: "", maxLength: 2_048 }),
  // When true the slugs become `only` (hard pin), else `order` (preference).
  providersOnly: t.Boolean({ default: false }),
  // Prompt template JSON (PromptItem[]); empty = default fixed order. Edited
  // by the template builder, serialized straight to the promptTemplate column.
  promptTemplate: t.String({ default: "", maxLength: 32_768 }),
  forceAlternateRoles: t.Boolean({ default: false }),
  noSystemRole: t.Boolean({ default: false }),
  mustStartWithUserInput: t.Boolean({ default: false }),
  geminiBlockOff: t.Boolean({ default: false }),
  isDefault: t.Boolean({ default: false }),
});

export type SamplingPresetForm = Static<typeof samplingPresetFormSchema>;

export const personaFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: MAX_NAME_LEN,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  description: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
  isDefault: t.Boolean({ default: false }),
});
export type PersonaForm = Static<typeof personaFormSchema>;

export const lorebookFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: MAX_NAME_LEN,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  description: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
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
    maxLength: MAX_DESC_LEN,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  position: t.Union(lorebookPositionLiterals, { default: "before_char" }),
  priority: t.Number({ minimum: 0, maximum: 1000, default: 100 }),
  // Form-only; stored as a @@probability decorator line in content (no column).
  probability: t.Number({ minimum: 0, maximum: 100, default: 100 }),
  // Form-only; 0 = inherit book scan depth. Stored as a @@scan_depth decorator line.
  entryScanDepth: t.Number({ minimum: 0, maximum: 100, default: 0 }),
  depth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  constant: t.Boolean({ default: false }),
  selective: t.Boolean({ default: false }),
  enabled: t.Boolean({ default: true }),
  matchWholeWords: t.Boolean({ default: false }),
  injectionRole: t.Union(lorebookInjectionRoleLiterals, { default: "system" }),
});
export type LorebookEntryForm = Static<typeof lorebookEntryFormSchema>;

export const characterFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: MAX_NAME_LEN,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  description: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
  personality: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
  scenario: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
  firstMessage: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
  exampleMessages: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
  systemPrompt: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
  postHistoryInstructions: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
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
    maxLength: MAX_NAME_LEN,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  description: t.String({ maxLength: MAX_DESC_LEN, default: "" }),
  personaId: t.String({ default: NONE_VALUE }),
  characterIds: t.Array(t.String(), { default: [] }),
  lorebookIds: t.Array(t.String(), { default: [] }),
});
export type CardForm = Static<typeof cardFormSchema>;
