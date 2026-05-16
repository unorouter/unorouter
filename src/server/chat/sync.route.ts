import { syncParams, syncRequestBody } from "@/lib/validation/sync";
import { getUserId } from "@/server/constants";
import { Elysia } from "elysia";
import {
  clearSyncExpiry,
  getSyncedBundle,
  getSyncStateBulk,
  setSyncExpiry,
  sweepExpired,
  sweepKey,
  type SyncKind,
} from "./sync.service";

// ---------------------------------------------------------------------------
// /api/sync — top-level router for the sync layer. One pair of endpoints per
// top-level entity kind (POST + DELETE), one bulk state probe, one bundle
// reader. sweepExpired runs once per request via the .derive() hook so any
// expired rows are gone before the handler sees the DB.
// ---------------------------------------------------------------------------

export const syncRoute = new Elysia({ prefix: "/sync" })
  .derive(async ({ cookie }) => {
    const uid = getUserId(cookie, true);
    if (uid) await sweepExpired(uid, sweepKey());
    return {};
  })

  // Bulk sync-state probe. Hydrator calls this on chat-page mount.
  .get("/state", async ({ cookie }) => {
    const userId = getUserId(cookie);
    const data = await getSyncStateBulk(userId);
    return { success: true, data };
  })

  // Read one synced bundle (entity + cascade children) for hydration.
  .get(
    "/:kind/:id/bundle",
    async ({ params, cookie }) => {
      const userId = getUserId(cookie);
      const data = await getSyncedBundle(
        userId,
        params.kind as SyncKind,
        params.id,
      );
      return { success: true, data };
    },
    { params: syncParams },
  )

  // Add sync / Resync. Idempotent: sets `syncExpiresAt = now+30d` and
  // upserts the entity + cascade children from `payload`. Same endpoint
  // covers first-time add and refresh; only the client-side label changes.
  .post(
    "/:kind/:id",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      const data = await setSyncExpiry(
        userId,
        params.kind as SyncKind,
        params.id,
        body,
      );
      return { success: true, data };
    },
    { params: syncParams, body: syncRequestBody },
  )

  // Remove sync. Hard-deletes server row + FK-cascade children. Client IDB
  // is untouched; the local row reverts to a not-synced local-only state.
  .delete(
    "/:kind/:id",
    async ({ params, cookie }) => {
      const userId = getUserId(cookie);
      const data = await clearSyncExpiry(
        userId,
        params.kind as SyncKind,
        params.id,
      );
      return { success: true, data };
    },
    { params: syncParams },
  );
