import { getPricingSummary } from "@/lib/api/pricing-cache";
import { msg } from "@/lib/config/constants";
import { uploadReferenceToR2 } from "@/lib/config/r2";
import {
  controlNetCatalogQuery,
  embeddingCatalogQuery,
  loraCatalogQuery,
  playgroundMaskUploadBody,
  playgroundPollBody,
  playgroundReferenceUploadBody,
  playgroundSubmitBody,
  upscalerCatalogQuery,
} from "@/lib/validation/playground";
import { getApiKeyOrGuest, getUserId } from "@/server/constants";
import { Elysia } from "elysia";
import { COMFYUI_TEMPLATE_IDS } from "./playground-constants";
import {
  listControlNetCatalog,
  listEmbeddingCatalog,
  listLoraCatalog,
  listUpscalerCatalog,
} from "./playground-catalogs";
import { pollGeneration, submitGeneration } from "./playground.service";

async function assertGuestAllowedModel(model: string): Promise<void> {
  if (COMFYUI_TEMPLATE_IDS.has(model)) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
  const meta = (await getPricingSummary()).models.find((m) => m.name === model);
  if (!meta?.isFree) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}

export const playgroundRoute = new Elysia({ prefix: "/playground" })
  .post(
    "/submit",
    async ({ body, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? 0;
      if (userId === 0) {
        await assertGuestAllowedModel(body.model);
      }
      const apiKey = getApiKeyOrGuest(cookie);
      return { success: true, data: await submitGeneration(apiKey, body) };
    },
    { body: playgroundSubmitBody },
  )
  .post(
    "/poll",
    async ({ body, cookie }) => {
      const apiKey = getApiKeyOrGuest(cookie);
      return { success: true, data: await pollGeneration(apiKey, body.taskId) };
    },
    { body: playgroundPollBody },
  )
  .post(
    "/references",
    async ({ body, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? 0;
      const buffer = Buffer.from(await body.file.arrayBuffer());
      return {
        success: true,
        data: await uploadReferenceToR2(
          userId,
          buffer,
          body.file.type || undefined,
        ),
      };
    },
    { body: playgroundReferenceUploadBody },
  )
  .post(
    "/masks",
    async ({ body, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? 0;
      const buffer = Buffer.from(await body.file.arrayBuffer());
      return {
        success: true,
        data: await uploadReferenceToR2(
          userId,
          buffer,
          body.file.type || undefined,
        ),
      };
    },
    { body: playgroundMaskUploadBody },
  )
  .get(
    "/loras",
    async ({ query }) => ({ success: true, data: await listLoraCatalog(query) }),
    { query: loraCatalogQuery },
  )
  .get(
    "/embeddings",
    async ({ query }) => ({
      success: true,
      data: await listEmbeddingCatalog(query),
    }),
    { query: embeddingCatalogQuery },
  )
  .get(
    "/upscalers",
    async ({ query }) => ({
      success: true,
      data: await listUpscalerCatalog(query),
    }),
    { query: upscalerCatalogQuery },
  )
  .get(
    "/controlnets",
    async ({ query }) => ({
      success: true,
      data: await listControlNetCatalog(query),
    }),
    { query: controlNetCatalogQuery },
  );
