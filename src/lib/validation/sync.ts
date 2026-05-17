import type { Static } from "elysia";
import { t } from "elysia";

// ---------------------------------------------------------------------------
// Validation for the sync endpoint family. POST /<kind>/:id/sync accepts an
// idempotent payload with optional TTL override + the full row bundle so the
// server can upsert from a missing or stale state. DELETE /<kind>/:id/sync
// takes no body.
// ---------------------------------------------------------------------------

export const SYNC_KINDS = [
  "characters",
  "personas",
  "lorebooks",
  "presets",
  "cards",
  "conversations",
  "generationSessions",
  "theme",
] as const;

export const syncKind = t.Union(SYNC_KINDS.map((k) => t.Literal(k)));
export type SyncKindName = Static<typeof syncKind>;

// `days` lets the client request a custom TTL; defaults to 30 server-side.
// `payload` shape varies by kind. We validate loosely (Unknown) because the
// per-kind upsert handler in sync.service.ts already narrows fields with
// runtime guards; tight schemas here would duplicate ~600 lines.
export const syncRequestBody = t.Object({
  days: t.Optional(t.Integer({ minimum: 1, maximum: 90 })),
  payload: t.Optional(t.Unknown()),
  // When true, server upserts the payload but leaves the existing
  // `syncExpiresAt` untouched. Used by mirror PATCH on save: the row is
  // already synced; we just want fresh content, not a renewed window.
  // Ignored when the row does not yet exist server-side (a fresh sync
  // always needs an expiry).
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
