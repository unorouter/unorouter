import { getPricingSummary } from "@/lib/api/pricing-cache";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import {
  catalogSearchQuery,
  playgroundSubmitBody,
} from "@/lib/validation/playground";
import { getUserId } from "@/server/constants";
import { resolveChatApiKey } from "@/server/billing/token/best-key.service";
import { Elysia, t } from "elysia";
import { submitGeneration } from "./image-submit.service";
import {
  resolveCivitaiCheckpoint,
  searchModelCatalog,
} from "./model-search.service";

async function assertGuestAllowedModel(model: string): Promise<void> {
  const meta = (await getPricingSummary()).byName.get(model);
  if (!meta?.isFree) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}

export const imageRoute = new Elysia({ prefix: "/image" })
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
  // Resolving a pasted Civitai reference is a separate step from generating with it, so the
  // form can hard-gate Generate until a checkpoint is known to exist. Resolution succeeding
  // is necessary but not sufficient: some models still fail to load at generation time.
  .post(
    "/resolve-civitai",
    async ({ body }) => ({
      success: true,
      data: await resolveCivitaiCheckpoint(body.query),
    }),
    { body: t.Object({ query: t.String({ minLength: 1, maxLength: 512 }) }) },
  );
