// Canonical client-side entity types: a row as stored in the SQLocal DB.
// This app is local-first, so the local DB row (drizzle `$inferSelect`, with
// `Date` timestamps) is the source of truth for the UI and hooks - not the
// JSON-serialized server response. Hooks import these instead of deriving
// types from the Eden RPC surface, which avoids casting between the two.

import type {
  characters,
  lorebooks,
  personas,
  requestLogs,
  samplingPresets,
} from "./shared";

export type CharacterRow = typeof characters.$inferSelect;
export type PersonaRow = typeof personas.$inferSelect;
export type LorebookRow = typeof lorebooks.$inferSelect;
export type PresetRow = typeof samplingPresets.$inferSelect;
export type RequestLogRow = typeof requestLogs.$inferSelect;
