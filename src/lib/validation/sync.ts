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

// Per-kind upsert handler in sync.service.ts narrows payload with runtime
// guards, so we validate loosely here (tight schemas would duplicate ~600 lines).
export const syncRequestBody = t.Object({
  days: t.Optional(t.Integer({ minimum: 1, maximum: 90 })),
  payload: t.Optional(t.Unknown()),
  // True: server upserts the payload but leaves `syncExpiresAt` untouched
  // (used by mirror PATCH on save). Ignored when the row does not yet exist
  // server-side; a fresh sync always needs an expiry.
  keepExpiry: t.Optional(t.Boolean()),
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
