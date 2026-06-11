import type { ConversationRow } from "@/lib/db/schema/rows";

// Settings columns live on the conversations row (formerly a 1:1 table); these
// helpers project them back into the { convId, ...settings } shape callers expect.
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
  "group",
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
  "firstMsgIndex",
] as const;

export type ConversationSettingsProjection = ConversationRow & {
  convId: string;
};

// The "projection" is just the row plus a convId alias: every settings column
// already lives on the conversation row, so picking keys gains nothing.
export function projectConversationSettings(
  conv: ConversationRow,
): ConversationSettingsProjection {
  return { ...conv, convId: conv.id };
}
