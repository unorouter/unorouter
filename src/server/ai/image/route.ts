import { getModelByName } from "@/server/models/pricing/pricing.service";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import { catalogSearchQuery, imageSubmitBody } from "@/lib/validation/image";
import { assertGuestOwnPurposeAccess } from "@/server/auth/guest-consent.service";
import { getUserId } from "@/server/constants";
import { rateLimit } from "@/server/rate-limit";
import { resolveChatApiKey } from "@/server/billing/token/best-key.service";
import { Elysia, t } from "elysia";
import { submitGeneration } from "./image-submit.service";
import { UpstreamImageError } from "./upstream";
import {
  findCheckpoints,
  listCheckpointVersions,
  searchModelCatalog,
} from "./model-search.service";

async function assertGuestAllowedModel(model: string): Promise<void> {
  if (!(await getModelByName(model))?.is_free) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}

// Each lookup below is a Runware call with our key and needs no login.
const catalogLimit = rateLimit(60);

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
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      if (userId === GUEST_USER_ID) {
        await assertGuestAllowedModel(body.model);
        await assertGuestOwnPurposeAccess(cookie, userId, body.model);
      }
      const apiKey = await resolveChatApiKey(cookie);
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
    "/catalog/embeddings",
    async ({ query }) => ({
      success: true,
      data: await searchModelCatalog("embeddings", query),
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
