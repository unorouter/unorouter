import { getPricingSummary } from "@/lib/api/pricing-cache";
import { msg } from "@/lib/config/constants";
import { uploadReferenceToR2 } from "@/lib/config/r2";
import { getDb } from "@/lib/db/server/client";
import {
  controlNetCatalog,
  embeddingCatalog,
  loraCatalog,
  upscalerCatalog,
} from "@/lib/db/schema";
import {
  controlNetCatalogQuery,
  embeddingCatalogQuery,
  playgroundHistoryQuery,
  playgroundImportBody,
  playgroundMaskUploadBody,
  playgroundReferenceUploadBody,
  playgroundSubmitBody,
  generationVisibilityBody,
  loraCatalogQuery,
  upscalerCatalogQuery,
} from "@/lib/validation/playground";
import { getApiKeyOrGuest, getUserId } from "@/server/constants";
import { and, asc, eq } from "drizzle-orm";
import { Elysia } from "elysia";

// ComfyUI templates hit our RunPod cluster on our quota; logged-in only.
const COMFYUI_TEMPLATE_IDS = new Set([
  "pony",
  "endgame",
  "comfyui-sdxl-txt2img-lora",
  "flux2-dev",
  "flux2-dev-compose",
]);

async function assertGuestAllowedModel(model: string): Promise<void> {
  if (COMFYUI_TEMPLATE_IDS.has(model)) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
  const meta = (await getPricingSummary()).models.find((m) => m.name === model);
  if (!meta?.isFree) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}
import {
  cloneFromPayload,
  deleteSession,
  deleteSnapshot,
  exportSession,
  getSession,
  getSnapshotWithImages,
  listUserSessions,
  pollSnapshotStatus,
  setVisibility,
  submitGeneration,
} from "./playground.service";

export const playgroundRoute = new Elysia({ prefix: "/playground" })
  .post(
    "/submit",
    async ({ body, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? 0;
      if (userId === 0) {
        await assertGuestAllowedModel(body.model);
      }
      const apiKey = getApiKeyOrGuest(cookie);
      return {
        success: true,
        data: await submitGeneration(userId, apiKey, body),
      };
    },
    { body: playgroundSubmitBody },
  )
  .get(
    "/me",
    async ({ query, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? 0;
      return {
        success: true,
        data: await listUserSessions(userId, query),
      };
    },
    { query: playgroundHistoryQuery },
  )
  .get("/session/:sessionId", async ({ params, cookie }) => {
    const userId = (await getUserId(cookie, true)) ?? 0;
    return {
      success: true,
      data: await getSession(userId, params.sessionId),
    };
  })
  .delete("/session/:sessionId", async ({ params, cookie }) => {
    const userId = (await getUserId(cookie, true)) ?? 0;
    return {
      success: true,
      data: await deleteSession(userId, params.sessionId),
    };
  })
  .get("/session/:sessionId/export", async ({ params, cookie }) => {
    const userId = (await getUserId(cookie, true)) ?? 0;
    return {
      success: true,
      data: await exportSession(userId, params.sessionId),
    };
  })
  .get("/snapshot/:id", async ({ params, cookie }) => {
    const userId = (await getUserId(cookie, true)) ?? 0;
    return {
      success: true,
      data: await getSnapshotWithImages(userId, params.id),
    };
  })
  .get("/snapshot/:id/status", async ({ params, cookie }) => {
    const userId = (await getUserId(cookie, true)) ?? 0;
    const apiKey = getApiKeyOrGuest(cookie);
    try {
      return {
        success: true,
        data: await pollSnapshotStatus(userId, apiKey, params.id),
      };
    } catch (e) {
      if (e instanceof Error && e.message === "ERRORS.NOT_FOUND") {
        return {
          success: true,
          data: { id: params.id, status: "failure" as const },
        };
      }
      throw e;
    }
  })
  .post(
    "/snapshot/:id/visibility",
    async ({ params, body, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? 0;
      return {
        success: true,
        data: await setVisibility(userId, params.id, body.visibility),
      };
    },
    { body: generationVisibilityBody },
  )
  .delete("/snapshot/:id", async ({ params, cookie }) => {
    const userId = (await getUserId(cookie, true)) ?? 0;
    return {
      success: true,
      data: await deleteSnapshot(userId, params.id),
    };
  })
  .post(
    "/import",
    async ({ body, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? 0;
      const apiKey = getApiKeyOrGuest(cookie);
      return {
        success: true,
        data: await cloneFromPayload({
          userId,
          apiKey,
          payload: body.payload,
          mode: body.mode,
        }),
      };
    },
    { body: playgroundImportBody },
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
    async ({ query }) => {
      const db = getDb();
      const conds = [eq(loraCatalog.visible, true)];
      if (query.baseModel)
        conds.push(eq(loraCatalog.baseModel, query.baseModel));
      if (query.category) conds.push(eq(loraCatalog.category, query.category));
      const items = await db
        .select()
        .from(loraCatalog)
        .where(and(...conds))
        .orderBy(asc(loraCatalog.sortOrder), asc(loraCatalog.name));
      return { success: true, data: { items } };
    },
    { query: loraCatalogQuery },
  )
  .get(
    "/embeddings",
    async ({ query }) => {
      const db = getDb();
      const conds = [eq(embeddingCatalog.visible, true)];
      if (query.baseModel)
        conds.push(eq(embeddingCatalog.baseModel, query.baseModel));
      if (query.category)
        conds.push(eq(embeddingCatalog.category, query.category));
      const items = await db
        .select()
        .from(embeddingCatalog)
        .where(and(...conds))
        .orderBy(asc(embeddingCatalog.sortOrder), asc(embeddingCatalog.name));
      return { success: true, data: { items } };
    },
    { query: embeddingCatalogQuery },
  )
  .get(
    "/upscalers",
    async ({ query }) => {
      const db = getDb();
      const conds = [eq(upscalerCatalog.visible, true)];
      if (query.category)
        conds.push(eq(upscalerCatalog.category, query.category));
      const items = await db
        .select()
        .from(upscalerCatalog)
        .where(and(...conds))
        .orderBy(asc(upscalerCatalog.sortOrder), asc(upscalerCatalog.name));
      return { success: true, data: { items } };
    },
    { query: upscalerCatalogQuery },
  )
  .get(
    "/controlnets",
    async ({ query }) => {
      const db = getDb();
      const conds = [eq(controlNetCatalog.visible, true)];
      if (query.baseModel)
        conds.push(eq(controlNetCatalog.baseModel, query.baseModel));
      if (query.kind) conds.push(eq(controlNetCatalog.kind, query.kind));
      const items = await db
        .select()
        .from(controlNetCatalog)
        .where(and(...conds))
        .orderBy(asc(controlNetCatalog.sortOrder), asc(controlNetCatalog.name));
      return { success: true, data: { items } };
    },
    { query: controlNetCatalogQuery },
  );
