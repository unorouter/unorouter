import type { ConversationRow } from "@/lib/db/schema/rows";

    // Settings columns live on the conversations row; these helpers project them into the { convId, ...settings } shape callers want.
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
  "showReasoning",
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

    // The projection is just the row plus a convId alias: every settings column already lives on the row, so picking gains nothing.
export function projectConversationSettings(
  conv: ConversationRow,
): ConversationSettingsProjection {
  return { ...conv, convId: conv.id };
}
