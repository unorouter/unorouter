// Schema-free sync constants needed at first paint; importing from sync.ts dragged TypeBox into every load.

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

// SYNC_KINDS subset mirrored row-by-row (excludes theme).
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
