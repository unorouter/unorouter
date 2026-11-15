import { GUEST_USER_ID } from "@/lib/config/constants";
import { catalogSearchQuery, imageSubmitBody } from "@/lib/validation/image";
import { assertGuestOwnPurposeAccess } from "@/server/auth/guest-consent.service";
import { rateLimit } from "@/server/rate-limit";
import {
  assertGuestFreeModel,
  resolveChatApiKey,
} from "@/server/billing/token/best-key.service";
import { serverEnv } from "@/server/env";
import { Elysia, t } from "elysia";
import { submitGeneration } from "./image-submit.service";
import { UpstreamImageError } from "./upstream";
import {
  findCheckpoints,
  listCheckpointVersions,
  searchModelCatalog,
} from "./model-search.service";

// Each lookup below is a Runware call with our key and needs no login.
const catalogLimit = rateLimit("image-catalog", 60);

export const imageRoute = new Elysia({ prefix: "/image" })
  .onError(({ error }): undefined => {
    const asJson = (status: number, body: string) =>
      new Response(body, {
        status,
        headers: { "content-type": "application/json" },
      }) as never;
    if (error instanceof UpstreamImageError) {
      const trimmed = error.body.trim();
      return asJson(
        error.status,
        trimmed.startsWith("{") || trimmed.startsWith("[")
          ? trimmed
          : JSON.stringify({ error: { message: error.message } }),
      );
    }
    if (error instanceof Error) {
      return asJson(500, JSON.stringify({ error: { message: error.message } }));
    }
  })
  .post(
    "/submit",
    async ({ body, cookie }) => {
      // The guest key decides it, not the cookie: user-id outlives an expired session.
      const apiKey = await resolveChatApiKey(cookie);
      if (apiKey === serverEnv.guestApiKey) {
        await assertGuestFreeModel(GUEST_USER_ID, body.model);
        await assertGuestOwnPurposeAccess(cookie, GUEST_USER_ID, body.model);
      }
      return { success: true, data: await submitGeneration(apiKey, body) };
    },
    { body: imageSubmitBody },
  )
  .get(
    "/catalog/loras",
    async ({ query }) => ({
      success: true,
      data: await searchModelCatalog("lora", query),
    }),
    { query: catalogSearchQuery, beforeHandle: catalogLimit },
  )
  .get(
    "/checkpoints",
    async ({ query }) => ({
      success: true,
      data: { items: await findCheckpoints(query.q) },
    }),
    {
      query: t.Object({ q: t.String({ maxLength: 512 }) }),
      beforeHandle: catalogLimit,
    },
  )
  .post(
    "/civitai-versions",
    async ({ body }) => ({
      success: true,
      data: { items: await listCheckpointVersions(body.query) },
    }),
    {
      body: t.Object({ query: t.String({ minLength: 1, maxLength: 512 }) }),
      beforeHandle: catalogLimit,
    },
  )
  .get(
    "/civitai-lora-versions",
    async ({ query }) => ({
      success: true,
      data: { items: await listCheckpointVersions(query.q, "lora") },
    }),
    {
      query: t.Object({ q: t.String({ maxLength: 512 }) }),
      beforeHandle: catalogLimit,
    },
  );
