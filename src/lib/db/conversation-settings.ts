import type { ConversationRow } from "@/lib/db/schema/rows";
import { jsonArray } from "@/lib/utils/base";

export const CONVERSATION_SETTINGS_KEYS = [
  "defaultModel",
  "personaId",
  "personaIds",
  "presetId",
  "systemPromptOverride",
  "authorNote",
  "authorNoteDepth",
  "chatMemory",
  "contextTokens",
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
  "autoScrollStream",
  "showReasoning",
  "groupOrderByOrder",
  "autoContinue",
  "memoryEnabled",
  "utilityModel",
  "titleModel",
  "titlePrompt",
  "imageEnabled",
  "voiceEnabled",
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

export function extraPersonaIds(conv: {
  personaIds?: string | null;
}): string[] {
  return jsonArray(conv.personaIds).filter(
    (id): id is string => typeof id === "string",
  );
}

export function personaIdsColumn(ids: string[]): string | null {
  return ids.length ? JSON.stringify(ids) : null;
}
