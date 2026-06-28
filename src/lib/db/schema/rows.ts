// Canonical client row types (drizzle $inferSelect with Date). UI source of truth.

import type {
  characters,
  chatGroups,
  conversations,
  lorebookEntries,
  lorebooks,
  personas,
  requestLogs,
  samplingPresets,
} from "./shared";
import type {
  customProviders,
  testerModels,
  testerProbes,
  testerProviders,
  testerTests,
} from "./client";

export type ConversationRow = typeof conversations.$inferSelect;
export type ChatGroupRow = typeof chatGroups.$inferSelect;
export type CharacterRow = typeof characters.$inferSelect;
export type PersonaRow = typeof personas.$inferSelect;
export type LorebookRow = typeof lorebooks.$inferSelect;
export type LorebookEntryRow = typeof lorebookEntries.$inferSelect;
export type PresetRow = typeof samplingPresets.$inferSelect;
export type RequestLogRow = typeof requestLogs.$inferSelect;
export type CustomProviderRow = typeof customProviders.$inferSelect;
export type TesterProviderRow = typeof testerProviders.$inferSelect;
export type TesterModelRow = typeof testerModels.$inferSelect;
export type TesterTestRow = typeof testerTests.$inferSelect;
export type TesterProbeRow = typeof testerProbes.$inferSelect;
