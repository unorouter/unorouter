export const SYNC_KINDS = [
  "characters",
  "personas",
  "lorebooks",
  "presets",
  "cards",
  "conversations",
  "playgroundSessions",
  "theme",
] as const;

export type SyncKindName = (typeof SYNC_KINDS)[number];

export const RP_SYNC_KINDS = [
  "characters",
  "personas",
  "lorebooks",
  "presets",
  "cards",
  "conversations",
  "playgroundSessions",
] as const;

export type RpSyncKind = (typeof RP_SYNC_KINDS)[number];
