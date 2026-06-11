// Canonical client row types (drizzle $inferSelect with Date). UI source of truth.

import type {
  characters,
  conversations,
  lorebookEntries,
  lorebooks,
  personas,
  requestLogs,
  samplingPresets,
} from "./shared";

export type ConversationRow = typeof conversations.$inferSelect;
export type CharacterRow = typeof characters.$inferSelect;
export type PersonaRow = typeof personas.$inferSelect;
export type LorebookRow = typeof lorebooks.$inferSelect;
export type LorebookEntryRow = typeof lorebookEntries.$inferSelect;
export type PresetRow = typeof samplingPresets.$inferSelect;
export type RequestLogRow = typeof requestLogs.$inferSelect;
