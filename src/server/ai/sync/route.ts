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
} from "./sync.service";

export const syncRoute = new Elysia({ prefix: "/sync" })
  .derive(async ({ cookie }) => {
    const uid = await getUserId(cookie, true);
    if (uid) await sweepExpired(uid, sweepKey());
    return {};
  })

  .get("/state", async ({ cookie }) => {
    const userId = await getUserId(cookie);
    const data = await getSyncStateBulk(userId);
    return { success: true, data };
  })

  .get(
    "/:kind/:id/bundle",
    async ({ params, cookie }) => {
      const userId = await getUserId(cookie);
      const data = await getSyncedBundle(
        userId,
        params.kind,
        params.id,
      );
      return { success: true, data };
    },
    { params: syncParams },
  )

  .post(
    "/:kind/:id",
    async ({ params, body, cookie }) => {
      const userId = await getUserId(cookie);
      const data = await setSyncExpiry(
        userId,
        params.kind,
        params.id,
        body,
      );
      return { success: true, data };
    },
    { params: syncParams, body: syncRequestBody },
  )

  .delete(
    "/:kind/:id",
    async ({ params, cookie }) => {
      const userId = await getUserId(cookie);
      const data = await clearSyncExpiry(
        userId,
        params.kind,
        params.id,
      );
      return { success: true, data };
    },
    { params: syncParams },
  );
