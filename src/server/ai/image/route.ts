import { getPricingSnapshot } from "@/server/models/pricing/pricing-snapshot";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import {
  catalogSearchQuery,
  playgroundSubmitBody,
} from "@/lib/validation/playground";
import { getUserId } from "@/server/constants";
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
  const meta = (await getPricingSnapshot()).byName.get(model);
  if (!meta?.isFree) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}

export const imageRoute = new Elysia({ prefix: "/image" })
  // Eden Treaty only parses error bodies served as JSON; Elysia's default text/plain
  // error response reaches the client as an unreadable stream and every toast collapsed
  // to a generic message. Upstream JSON bodies pass through verbatim. The `never` casts
  // keep the hook's Response out of Eden's inferred success types for every route.
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
      }
      const apiKey = await resolveChatApiKey(cookie);
      return { success: true, data: await submitGeneration(apiKey, body) };
    },
    { body: playgroundSubmitBody },
  )
  .get(
    "/catalog/loras",
    async ({ query }) => ({
      success: true,
      data: await searchModelCatalog("lora", query),
    }),
    { query: catalogSearchQuery },
  )
  .get(
    "/catalog/embeddings",
    async ({ query }) => ({
      success: true,
      data: await searchModelCatalog("embeddings", query),
    }),
    { query: catalogSearchQuery },
  )
  .get(
    "/catalog/vaes",
    async ({ query }) => ({
      success: true,
      data: await searchModelCatalog("vae", query),
    }),
    { query: catalogSearchQuery },
  )
  // One search for every reference form plus plain names, so the picker needs no mode switch.
  .get(
    "/checkpoints",
    async ({ query }) => ({
      success: true,
      data: { items: await findCheckpoints(query.q) },
    }),
    { query: t.Object({ q: t.String({ maxLength: 512 }) }) },
  )
  // A Civitai model is a family of versions that generate differently, so resolving a
  // reference returns all of them rather than silently choosing.
  .post(
    "/civitai-versions",
    async ({ body }) => ({
      success: true,
      data: { items: await listCheckpointVersions(body.query) },
    }),
    { body: t.Object({ query: t.String({ minLength: 1, maxLength: 512 }) }) },
  )
  // LoRA twin of /civitai-versions; only the search category differs.
  .get(
    "/civitai-lora-versions",
    async ({ query }) => ({
      success: true,
      data: { items: await listCheckpointVersions(query.q, "lora") },
    }),
    { query: t.Object({ q: t.String({ maxLength: 512 }) }) },
  );
