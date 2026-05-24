import type { Static } from "elysia";
import { t } from "elysia";

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

export const syncKind = t.Union(SYNC_KINDS.map((k) => t.Literal(k)));
export type SyncKindName = Static<typeof syncKind>;

// The subset of SYNC_KINDS mirrored row-by-row by client hooks (everything
// except `theme`, which syncs as a single per-user row).
export const RP_SYNC_KINDS = [
  "characters",
  "personas",
  "lorebooks",
  "presets",
  "cards",
  "conversations",
  "playgroundSessions",
] as const;

export const rpSyncKind = t.Union(RP_SYNC_KINDS.map((k) => t.Literal(k)));
export type RpSyncKind = Static<typeof rpSyncKind>;

// Controls how the conversations upsert handler reconciles child arrays.
// - "replace" (default, back-compat): tx.delete + reinsert per array.
// - "upsert": per-row primary-key upsert; preserves rows not present in payload.
// - "append": skip delete entirely; insert/onConflictDoUpdate per row.
// Only "conversations" kind honors this today; other kinds ignore the flag.
export const syncMergeMode = t.Union([
  t.Literal("replace"),
  t.Literal("upsert"),
  t.Literal("append"),
]);
export type SyncMergeMode = Static<typeof syncMergeMode>;

// Per-kind upsert handler in sync.service.ts narrows payload with runtime
// guards, so we validate loosely here (tight schemas would duplicate ~600 lines).
export const syncRequestBody = t.Object({
  days: t.Optional(t.Integer({ minimum: 1, maximum: 90 })),
  payload: t.Optional(t.Unknown()),
  // True: server upserts the payload but leaves `syncExpiresAt` untouched
  // (used by mirror PATCH on save). Ignored when the row does not yet exist
  // server-side; a fresh sync always needs an expiry.
  keepExpiry: t.Optional(t.Boolean()),
  mergeMode: t.Optional(syncMergeMode),
});
export type SyncRequestBody = Static<typeof syncRequestBody>;

export const syncParams = t.Object({
  kind: syncKind,
  id: t.String({ minLength: 1, maxLength: 64 }),
});
export type SyncParams = Static<typeof syncParams>;

export const syncedOnlyQuery = t.Object({
  syncedOnly: t.Optional(t.Boolean()),
});
export type SyncedOnlyQuery = Static<typeof syncedOnlyQuery>;

// Cap batch request count server-side to bound query fanout.
export const BATCH_BUNDLE_MAX_REQUESTS = 20;

export const batchBundleRequestBody = t.Object({
  requests: t.Array(
    t.Object({
      kind: syncKind,
      id: t.String({ minLength: 1, maxLength: 64 }),
    }),
    { minItems: 1, maxItems: BATCH_BUNDLE_MAX_REQUESTS },
  ),
});
export type BatchBundleRequestBody = Static<typeof batchBundleRequestBody>;
