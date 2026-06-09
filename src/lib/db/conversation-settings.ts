import type { ConversationRow } from "@/lib/db/schema/rows";

// Settings columns now live on the conversations row (formerly a 1:1
// conversation_settings table). These helpers project them back into the
// { convId, ...settings } shape callers + the sync bundle still expect.
export const CONVERSATION_SETTINGS_KEYS = [
  "defaultModel",
  "personaId",
  "presetId",
  "systemPromptOverride",
  "authorNote",
  "authorNoteDepth",
  "chatMemory",
  "reasoningEffort",
  "webSearchEnabled",
  "webSearchEngine",
  "webSearchContextSize",
  "temperature",
  "topP",
  "topK",
  "minP",
  "topA",
  "frequencyPenalty",
  "presencePenalty",
  "repetitionPenalty",
  "maxTokens",
  "extraBody",
  "vars",
  "streamingEnabled",
  "groupOrderByOrder",
  "autoContinue",
  "memoryEnabled",
  "summaryMemory",
  "summaryAnchor",
] as const;

export type ConversationSettingsProjection = { convId: string } & Pick<
  ConversationRow,
  (typeof CONVERSATION_SETTINGS_KEYS)[number]
>;

export function projectConversationSettings(
  conv: ConversationRow,
): ConversationSettingsProjection {
  const out = { convId: conv.id } as ConversationSettingsProjection;
  for (const k of CONVERSATION_SETTINGS_KEYS) {
    (out as Record<string, unknown>)[k] = conv[k];
  }
  return out;
}
