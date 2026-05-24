// Canonical client-side entity types: a row as stored in the SQLocal DB.
// This app is local-first, so the local DB row (drizzle `$inferSelect`, with
// `Date` timestamps) is the source of truth for the UI and hooks - not the
// JSON-serialized server response. Hooks import these instead of deriving
// types from the Eden RPC surface, which avoids casting between the two.

import type {
  cardCharacters,
  cardLorebooks,
  cards,
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  conversationSettings,
  lorebookEntries,
  lorebooks,
  personas,
  requestLogs,
  samplingPresets,
} from "./shared";

export type CharacterRow = typeof characters.$inferSelect;
export type PersonaRow = typeof personas.$inferSelect;
export type LorebookRow = typeof lorebooks.$inferSelect;
export type LorebookEntryRow = typeof lorebookEntries.$inferSelect;
export type PresetRow = typeof samplingPresets.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type CardCharacterRow = typeof cardCharacters.$inferSelect;
export type CardLorebookRow = typeof cardLorebooks.$inferSelect;
export type ConversationRow = typeof conversations.$inferSelect;
export type ConversationSettingsRow = typeof conversationSettings.$inferSelect;
export type ConversationCharacterRow =
  typeof conversationCharacters.$inferSelect;
export type ConversationLorebookRow = typeof conversationLorebooks.$inferSelect;
export type RequestLogRow = typeof requestLogs.$inferSelect;

// A lorebook with its entries inlined, as the detail reader returns it.
export type LorebookWithEntries = LorebookRow & {
  entries: LorebookEntryRow[];
};

// A card with its character / lorebook bindings inlined, as readLocalCard
// returns it.
export type CardWithBindings = CardRow & {
  cardCharacters: CardCharacterRow[];
  cardLorebooks: CardLorebookRow[];
};

// The conversation bindings as the bindings reader / hook surface them.
export type ConversationBindings = {
  characters: ConversationCharacterRow[];
  lorebooks: ConversationLorebookRow[];
};

// A conversation row with the model column flattened in from the settings row,
// as readLocalConversation / readLocalConversations return it.
export type ConversationWithModel = ConversationRow & {
  model: string | null;
};
