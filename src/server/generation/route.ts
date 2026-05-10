import { getModelMetadata } from "@/lib/api/pricing-cache";
import { msg } from "@/lib/config/constants";
import { uploadReferenceToR2 } from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import {
  controlNetCatalog,
  embeddingCatalog,
  loraCatalog,
  upscalerCatalog,
} from "@/lib/db/schema";
import {
  controlNetCatalogQuery,
  embeddingCatalogQuery,
  generationCloneFromShareBody,
  generationHistoryQuery,
  generationImportBody,
  generationMaskUploadBody,
  generationReferenceUploadBody,
  generationSubmitBody,
  generationVisibilityBody,
  loraCatalogQuery,
  upscalerCatalogQuery,
} from "@/lib/validation/generation";
import { getApiKeyOrGuest, getUserId } from "@/server/constants";
import { and, asc, eq } from "drizzle-orm";
import { Elysia } from "elysia";

// ComfyUI templates are gated to logged-in users: they hit our self-hosted
// RunPod cluster and run on our quota, not the upstream's free models pool.
// Guests can submit only image models flagged `isFree` in /api/pricing
// (e.g. flux.1-schnell), which the upstream serves for free.
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
  const meta = await getModelMetadata(model);
  if (!meta.isFree) {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}
import {
  cloneFromPayload,
  createShareLink,
  deleteSession,
  deleteSnapshot,
  exportSession,
  exportSharedSession,
  getSession,
  getSharedSession,
  getSnapshotWithImages,
  listUserSessions,
  pollSnapshotStatus,
  revokeShareLink,
  setVisibility,
  submitGeneration,
} from "./generation.service";

export const generationRoute = new Elysia({ prefix: "/generation" })
  // Submit one snapshot. If body.sessionId is set the snapshot is
  // appended to that session; otherwise a fresh session is created and
  // returned. Response: { session, snapshot }.
  .post(
    "/submit",
    async ({ body, cookie }) => {
      // Guests get a synthetic userId=0 and the shared GUEST_API_KEY. They
      // can only submit free models (assertGuestAllowedModel rejects paid
      // models + every ComfyUI template, which run on our quota).
      const userId = getUserId(cookie, true) ?? 0;
      if (userId === 0) {
        await assertGuestAllowedModel(body.model);
      }
      const apiKey = getApiKeyOrGuest(cookie);
      return {
        success: true,
        data: await submitGeneration(userId, apiKey, body),
      };
    },
    { body: generationSubmitBody },
  )
  // List the current user's sessions. Cursor-paginated by updatedAt
  // desc. Each item carries the latest snapshot + that snapshot's first
  // image so the recent-list cards render without a second roundtrip.
  .get(
    "/me",
    async ({ query, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      return {
        success: true,
        data: await listUserSessions(userId, query),
      };
    },
    { query: generationHistoryQuery },
  )
  // Full session payload for the chevron view.
  .get("/session/:sessionId", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    return {
      success: true,
      data: await getSession(userId, params.sessionId),
    };
  })
  // Delete a whole session and every snapshot it contains.
  .delete("/session/:sessionId", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    return {
      success: true,
      data: await deleteSession(userId, params.sessionId),
    };
  })
  // Mint a public share token for a session. Idempotent.
  .post("/session/:sessionId/share", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    return {
      success: true,
      data: await createShareLink(userId, params.sessionId),
    };
  })
  .delete("/session/:sessionId/share", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    return {
      success: true,
      data: await revokeShareLink(userId, params.sessionId),
    };
  })
  // Download a snapshot of a session the user owns (full history).
  .get("/session/:sessionId/export", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    return {
      success: true,
      data: await exportSession(userId, params.sessionId),
    };
  })
  // Single snapshot detail (polling read and form-restore source).
  .get("/snapshot/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    return {
      success: true,
      data: await getSnapshotWithImages(userId, params.id),
    };
  })
  // Poll upstream + reflect status into the snapshot row.
  .get("/snapshot/:id/status", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    const apiKey = getApiKeyOrGuest(cookie);
    return {
      success: true,
      data: await pollSnapshotStatus(userId, apiKey, params.id),
    };
  })
  // Owner-only visibility toggle on a single snapshot.
  .post(
    "/snapshot/:id/visibility",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      return {
        success: true,
        data: await setVisibility(userId, params.id, body.visibility),
      };
    },
    { body: generationVisibilityBody },
  )
  // Delete a single snapshot. If it was the last in its session, the
  // session is dropped too.
  .delete("/snapshot/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    return {
      success: true,
      data: await deleteSnapshot(userId, params.id),
    };
  })
  // Public read of a shared session. Returns the full snapshot history.
  .get("/shared/:shareId", async ({ params }) => {
    return {
      success: true,
      data: await getSharedSession(params.shareId),
    };
  })
  // Download a session snapshot from a public share token.
  .get("/shared/:shareId/export", async ({ params }) => {
    return {
      success: true,
      data: await exportSharedSession(params.shareId),
    };
  })
  // Clone an uploaded payload (single-snapshot or full-session) into the
  // current user's account. Returns { sessionId }.
  .post(
    "/import",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
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
    { body: generationImportBody },
  )
  // Fork a shared session into the current user's account.
  .post(
    "/shared/:shareId/fork",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      const apiKey = getApiKeyOrGuest(cookie);
      const payload = await exportSharedSession(params.shareId);
      return {
        success: true,
        data: await cloneFromPayload({
          userId,
          apiKey,
          payload,
          mode: body.mode,
        }),
      };
    },
    { body: generationCloneFromShareBody },
  )
  // Reference image upload. Same as before: multipart -> R2 -> URL.
  .post(
    "/references",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
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
    { body: generationReferenceUploadBody },
  )
  // Mask upload for Inpaint mode. Same pipeline as /references — the
  // mask is a small PNG (one channel) and stores cheaply in R2 under
  // the generation-references prefix.
  .post(
    "/masks",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
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
    { body: generationMaskUploadBody },
  )
  // LoRA catalog (unchanged).
  .get(
    "/loras",
    async ({ query }) => {
      const db = getDb();
      const conds = [eq(loraCatalog.visible, true)];
      if (query.baseModel) conds.push(eq(loraCatalog.baseModel, query.baseModel));
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
  // Embedding catalog. Same shape as /loras (operators curate rows).
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
  // Upscaler catalog. Family-agnostic; only `category` filter.
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
  // ControlNet catalog. Filter by base-model + kind.
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
