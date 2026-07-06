import { Type as t, type Static } from "@sinclair/typebox/type";
import { nullable, samplingNullable } from "./helpers";
import { reasoningEffort, webSearchContextSize, webSearchEngine } from "./chat";
import { msg, NONE_VALUE, type TranslationKey } from "../config/constants";
import {
  LOREBOOK_INJECTION_ROLES,
  MAX_DESC_LEN,
  MAX_NAME_LEN,
  type LorebookInjectionRole,
} from "./rp";
export { LOREBOOK_INJECTION_ROLES, type LorebookInjectionRole };

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

export type SamplingFieldName = SamplingParam["field"];
export const SAMPLING_FIELDS = SAMPLING_PARAMS.map(
  (p) => p.field,
) as SamplingFieldName[];

export const RP_TABS = [
  "characters",
  "personas",
  "lorebooks",
  "custom-providers",
] as const;
export type RpTab = (typeof RP_TABS)[number];

const reasoningEffortLiterals = [
  t.Literal(NONE_VALUE),
  ...reasoningEffort.anyOf,
];
const webSearchEngineLiterals = webSearchEngine.anyOf;
const webSearchContextSizeLiterals = webSearchContextSize.anyOf;

const lorebookInjectionRoleLiterals = LOREBOOK_INJECTION_ROLES.map((r) =>
  t.Literal(r),
);

const nullableNumber = (min: number, max: number) =>
  nullable(t.Number({ minimum: min, maximum: max }));

export const conversationOverridesFormSchema = t.Object({
  personaId: t.String({ default: NONE_VALUE }),
  presetId: t.String({ default: NONE_VALUE }),
  reasoningEffort: t.Union(reasoningEffortLiterals, { default: NONE_VALUE }),
  chatMemory: nullableNumber(1, 1000),
  authorNoteDepth: t.Number({ minimum: 0, maximum: 100, default: 4 }),
  systemPromptOverride: t.String({ default: "" }),
  authorNote: t.String({ default: "" }),
  webSearchEnabled: t.Boolean({ default: false }),
  webSearchEngine: t.Union(webSearchEngineLiterals, { default: "auto" }),
  webSearchContextSize: t.Union(webSearchContextSizeLiterals, {
    default: "medium",
  }),
  memoryEnabled: t.Boolean({ default: false }),
  imageEnabled: t.Boolean({ default: false }),
  utilityModel: t.String({ default: NONE_VALUE }),
  promptInstruction: t.String({ default: "", maxLength: 4_096 }),
  imageModel: t.String({ default: NONE_VALUE }),
  imagePreview: t.Boolean({ default: false }),
  useCharAvatarRef: t.Boolean({ default: false }),
  characterIds: t.Array(t.String(), { default: [] }),
  lorebookIds: t.Array(t.String(), { default: [] }),
  ...samplingNullable({ maxTokensMax: 1_000_000 }),
  extraBody: t.String({ default: "", maxLength: 8_192 }),
  streamingEnabled: nullable(t.Boolean()),
  showReasoning: nullable(t.Boolean()),
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
  ...samplingNullable({ temperatureMax: 4, maxTokensMax: 1_000_000 }),
  streamingEnabled: nullable(t.Boolean()),
  showReasoning: nullable(t.Boolean()),
  chatMemory: nullableNumber(1, 1000),
  memoryEnabled: nullable(t.Boolean()),
  imageEnabled: nullable(t.Boolean()),
  utilityModel: t.String({ default: "", maxLength: 256 }),
  promptInstruction: t.String({ default: "", maxLength: 4_096 }),
  imageModel: t.String({ default: "", maxLength: 512 }),
  imagePreview: nullable(t.Boolean()),
  useCharAvatarRef: nullable(t.Boolean()),
  mainPrompt: t.String({ default: "", maxLength: MAX_DESC_LEN }),
  postHistory: t.String({ default: "", maxLength: MAX_DESC_LEN }),
  postHistoryRole: t.Union([t.Literal("system"), t.Literal("user")], {
    default: "system",
  }),
  prefill: t.String({ default: "", maxLength: MAX_DESC_LEN }),
  providers: t.String({ default: "", maxLength: 2_048 }),
  providersOnly: t.Boolean({ default: false }),
  promptTemplate: t.String({ default: "", maxLength: 32_768 }),
  forceAlternateRoles: t.Boolean({ default: false }),
  noSystemRole: t.Boolean({ default: false }),
  mustStartWithUserInput: t.Boolean({ default: false }),
  geminiBlockOff: t.Boolean({ default: false }),
  isDefault: t.Boolean({ default: false }),
});

export type SamplingPresetForm = Static<typeof samplingPresetFormSchema>;

export const personaFormSchema = t.Object({
  title: t.String({ maxLength: MAX_NAME_LEN, default: "" }),
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

export const lorebookEntryFormSchema = t.Object({
  comment: t.String({ maxLength: MAX_NAME_LEN, default: "" }),
  keys: t.String({ default: "" }),
  secondaryKeys: t.String({ default: "" }),
  content: t.String({
    minLength: 1,
    maxLength: MAX_DESC_LEN,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  priority: t.Integer({ default: 100 }),
  orderIndex: t.Integer({ default: 0 }),
  probability: t.Number({ minimum: 0, maximum: 100, default: 100 }),
  entryScanDepth: t.Number({ minimum: 0, maximum: 100, default: 0 }),
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
