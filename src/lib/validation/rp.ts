import type { Static } from "elysia";
import { t } from "elysia";
import { nullable, samplingNullable } from "./helpers";
import { tokenizerRef } from "./tokenizer";
import { reasoningEffort } from "./chat";
import {
  MAX_CHAT_MEMORY,
  MAX_CONTEXT_TOKENS,
  MIN_CONTEXT_TOKENS,
} from "../config/constants";

export const MAX_NAME_LEN = 200;
export const MAX_DESC_LEN = 200_000;

export type LorebookBody = {
  name: string;
  description: string | null;
  greeting: string | null;
  avatarMediaId?: string | null;
  scanDepth: number;
  tokenBudget: number;
  recursiveScanning: boolean;
};

export const LOREBOOK_INJECTION_ROLES = [
  "user",
  "system",
  "assistant",
] as const;
export type LorebookInjectionRole = (typeof LOREBOOK_INJECTION_ROLES)[number];
export const lorebookInjectionRole = t.Union(
  LOREBOOK_INJECTION_ROLES.map((r) => t.Literal(r)),
);

export type LorebookEntryBody = {
  keys: string[];
  secondaryKeys: string[] | null;
  content: string;
  constant: boolean;
  selective: boolean;
  priority: number;
  orderIndex: number;
  enabled: boolean;
  matchWholeWords: boolean;
  injectionRole: LorebookInjectionRole;
};

export const samplingPresetBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  ...samplingNullable({ temperatureMax: 4 }),
  streamingEnabled: nullable(t.Boolean()),
  autoScrollStream: nullable(t.Boolean()),
  showReasoning: nullable(t.Boolean()),
  reasoningEffort: nullable(t.Union(reasoningEffort.anyOf)),
  chatMemory: nullable(t.Number({ minimum: 1, maximum: MAX_CHAT_MEMORY })),
  contextTokens: nullable(
    t.Number({ minimum: MIN_CONTEXT_TOKENS, maximum: MAX_CONTEXT_TOKENS }),
  ),
  extraBody: nullable(t.String({ maxLength: 8_192 })),
  providers: nullable(t.String({ maxLength: 4_096 })),
  promptTemplate: nullable(t.String({ maxLength: 131_072 })),
  mainPrompt: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  postHistory: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  postHistoryRole: nullable(t.Union([t.Literal("system"), t.Literal("user")])),
  prefill: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  reasoningPrefill: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  continuePrompt: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  impersonatePrompt: nullable(t.String({ maxLength: MAX_DESC_LEN })),
  tokenizer: nullable(tokenizerRef),
  forceAlternateRoles: t.Boolean({ default: false }),
  noSystemRole: t.Boolean({ default: false }),
  mustStartWithUserInput: t.Boolean({ default: false }),
  geminiBlockOff: t.Boolean({ default: false }),
  disableCaching: t.Boolean({ default: false }),
  keepReasoning: t.Boolean({ default: false }),
  keepSystemRoles: t.Boolean({ default: false }),
  isDefault: t.Optional(t.Boolean()),
});
export type SamplingPresetBody = Static<typeof samplingPresetBody>;

export type CardBody = {
  name: string;
  description: string | null;
  personaId: string | null;
  characterIds: string[];
  lorebookIds: string[];
};

export type CardApplyMode = "replace" | "merge";

export type ExportFormat = "native" | "orpg" | "sillytavern";

export type ConversationExportFormat = "native" | "orpg";

export type CharacterExportFormat = "png" | "charx" | "voxta" | "json";

export type LorebookExportFormat = "sillytavern" | "agnai" | "risu" | "ccv3";
