import {
  batchBundleRequestBody,
  syncParams,
  syncRequestBody,
} from "@/lib/validation/sync";
import { errMessage } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getUserId } from "@/server/constants";
import { Elysia } from "elysia";
import { getSyncedBundle, getSyncedBundlesBatch } from "./bundles";
import { clearSyncExpiry, setSyncExpiry } from "./expiry";
import { getSyncStateBulk } from "./state";
import { sweepExpired, sweepKey } from "./sweep";

export const syncRoute = new Elysia({ prefix: "/sync" })
  // Outbox pushes retry on 5xx; without this the failure cause never surfaces.
  .onError(({ error, request }) => {
    logger.error("Sync route failed", {
      context: "sync.route",
      path: new URL(request.url).pathname,
      method: request.method,
      error: errMessage(error),
    });
  })
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
      const data = await getSyncedBundle(userId, params.kind, params.id);
      return { success: true, data };
    },
    { params: syncParams },
  )

  .post(
    "/bundles",
    async ({ body, cookie }) => {
      const userId = await getUserId(cookie);
      const data = await getSyncedBundlesBatch(userId, body.requests);
      return { success: true, data };
    },
    { body: batchBundleRequestBody },
  )

  .post(
    "/:kind/:id",
    async ({ params, body, cookie }) => {
      const userId = await getUserId(cookie);
      const data = await setSyncExpiry(userId, params.kind, params.id, body);
      return { success: true, data };
    },
    { params: syncParams, body: syncRequestBody },
  )

  .delete(
    "/:kind/:id",
    async ({ params, cookie }) => {
      const userId = await getUserId(cookie);
      const data = await clearSyncExpiry(userId, params.kind, params.id);
      return { success: true, data };
    },
    { params: syncParams },
  );
