import type { ConversationRow } from "@/lib/db/schema/rows";

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
  "utilityModel",
  "imageEnabled",
  "promptInstruction",
  "imageModel",
  "imagePreview",
  "imageRefIds",
  "useCharAvatarRef",
  "summaryMemory",
  "summaryAnchor",
  "firstMsgIndex",
] as const;

export type ConversationSettingsProjection = ConversationRow & {
  convId: string;
};

export function projectConversationSettings(
  conv: ConversationRow,
): ConversationSettingsProjection {
  return { ...conv, convId: conv.id };
}
