    // Schema-free sync constants needed at first paint; importing from sync.ts dragged ~110KB of TypeBox into every load.

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

// Cap batch request count server-side to bound query fanout.
export const BATCH_BUNDLE_MAX_REQUESTS = 20;

// Stage-2 chunk size; keep <= BATCH_BUNDLE_MAX_REQUESTS.
export const SYNC_BUNDLE_CHUNK_SIZE = 16;
