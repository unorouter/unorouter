import { getPricingSummary } from "@/lib/api/pricing-cache";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import { uploadReferenceToR2 } from "@/lib/config/r2";
import {
  embeddingCatalogQuery,
  loraCatalogQuery,
  playgroundMaskUploadBody,
  playgroundPollBody,
  playgroundReferenceUploadBody,
  playgroundSubmitBody,
  upscalerCatalogQuery,
} from "@/lib/validation/playground";
import { getUserId } from "@/server/constants";
import { resolveChatApiKey } from "@/server/billing/token/best-key.service";
import { Elysia } from "elysia";
import { COMFYUI_TEMPLATE_IDS } from "./playground-constants";
import {
  listEmbeddingCatalog,
  listLoraCatalog,
  listUpscalerCatalog,
} from "./playground-catalogs";
import { pollGeneration, submitGeneration } from "./playground.service";

type Cookies = Parameters<typeof getUserId>[0];

async function uploadGenPlaygroundFile(file: File, cookie: Cookies) {
  const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    success: true as const,
    data: await uploadReferenceToR2(userId, buffer, file.type || undefined),
  };
}

async function assertGuestAllowedModel(model: string): Promise<void> {
  if (COMFYUI_TEMPLATE_IDS.has(model)) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
  const meta = (await getPricingSummary()).byName.get(model);
  if (!meta?.isFree) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}

export const playgroundRoute = new Elysia({ prefix: "/playground" })
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
  .post(
    "/poll",
    async ({ body, cookie }) => {
      const apiKey = await resolveChatApiKey(cookie);
      return { success: true, data: await pollGeneration(apiKey, body.taskId) };
    },
    { body: playgroundPollBody },
  )
  .post(
    "/references",
    async ({ body, cookie }) => uploadGenPlaygroundFile(body.file, cookie),
    { body: playgroundReferenceUploadBody },
  )
  .post(
    "/masks",
    async ({ body, cookie }) => uploadGenPlaygroundFile(body.file, cookie),
    { body: playgroundMaskUploadBody },
  )
  .get(
    "/loras",
    async ({ query }) => ({
      success: true,
      data: await listLoraCatalog(query),
    }),
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
  );
