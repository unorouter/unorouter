import type {
  characters,
  chatGroups,
  conversations,
  lorebookEntries,
  lorebooks,
  personas,
  requestLogs,
  samplingPresets,
  testerModels,
  testerProbes,
  testerProviders,
  testerTests,
} from "./shared";
import type { customProviders, jsPlugins } from "./client";

export type ConversationRow = typeof conversations.$inferSelect;
export type ChatGroupRow = typeof chatGroups.$inferSelect;
export type CharacterRow = typeof characters.$inferSelect;
export type PersonaRow = typeof personas.$inferSelect;
export type LorebookRow = typeof lorebooks.$inferSelect;
export type LorebookEntryRow = typeof lorebookEntries.$inferSelect;
export type PresetRow = typeof samplingPresets.$inferSelect;
export type RequestLogRow = typeof requestLogs.$inferSelect;
export type CustomProviderRow = typeof customProviders.$inferSelect;
export type JsPluginRow = typeof jsPlugins.$inferSelect;
export type TesterProviderRow = typeof testerProviders.$inferSelect;
export type TesterModelRow = typeof testerModels.$inferSelect;
export type TesterTestRow = typeof testerTests.$inferSelect;
export type TesterProbeRow = typeof testerProbes.$inferSelect;
