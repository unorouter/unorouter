import { uploadReferenceToR2 } from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import { loraCatalog } from "@/lib/db/schema";
import {
  generationCloneFromShareBody,
  generationHistoryQuery,
  generationImportBody,
  generationReferenceUploadBody,
  generationSubmitBody,
  generationVisibilityBody,
  loraCatalogQuery,
} from "@/lib/validation/generation";
import { getApiKeyOrGuest, getUserId } from "@/server/constants";
import { and, asc, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import {
  cloneFromSnapshot,
  createShareLink,
  deleteGeneration,
  exportGeneration,
  exportSharedGeneration,
  getGenerationWithImages,
  getSharedGeneration,
  listUserGenerations,
  pollGenerationStatus,
  revokeShareLink,
  setVisibility,
  submitGeneration,
} from "./generation.service";

export const generationRoute = new Elysia({ prefix: "/generation" })
  // Submit one image generation. One row per click; the upstream may
  // produce N images depending on `params.n` (1, 2, or 4). Returns the
  // freshly-inserted row with its images attached (empty until upstream
  // finalizes for async ComfyUI tasks; populated for sync image models).
  .post(
    "/submit",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      const apiKey = getApiKeyOrGuest(cookie);
      return {
        success: true,
        data: await submitGeneration(userId, apiKey, body),
      };
    },
    { body: generationSubmitBody },
  )
  // List the current user's history. Cursor-paginated by createdAt desc;
  // optional batchId / model filters.
  .get(
    "/me",
    async ({ query, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await listUserGenerations(userId, query),
      };
    },
    { query: generationHistoryQuery },
  )
  // Single generation detail (also used as a polling read).
  .get("/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await getGenerationWithImages(userId, params.id),
    };
  })
  // Poll upstream and reflect the latest status into the row. On terminal
  // success the upstream image is downloaded + uploaded to R2 inline so
  // the response already carries r2Url.
  .get("/:id/status", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    const apiKey = getApiKeyOrGuest(cookie);
    return {
      success: true,
      data: await pollGenerationStatus(userId, apiKey, params.id),
    };
  })
  // Owner-only visibility toggle. Public makes the row eligible for the
  // /feed route below.
  .post(
    "/:id/visibility",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await setVisibility(userId, params.id, body.visibility),
      };
    },
    { body: generationVisibilityBody },
  )
  // Delete a generation row + its R2 object. Cascade-deletes likes via
  // the FK in the schema.
  .delete("/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await deleteGeneration(userId, params.id) };
  })
  // Mint a public share token. Idempotent; returns the existing shareId
  // when called twice on the same row. The URL the client builds is
  // /shared/<shareId>.
  .post("/:id/share", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await createShareLink(userId, params.id),
    };
  })
  .delete("/:id/share", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await revokeShareLink(userId, params.id),
    };
  })
  // Public read of a shared generation. No auth required; anyone with
  // the shareId can view. Strips submitted-key and other server-only
  // fields. Returns the same shape getGenerationWithImages does.
  .get("/shared/:shareId", async ({ params }) => {
    return {
      success: true,
      data: await getSharedGeneration(params.shareId),
    };
  })
  // Download a snapshot JSON of the user's own generation. Same payload
  // shape that the import route accepts. UI wraps the response in a
  // Blob and triggers the browser's save dialog.
  .get("/:id/export", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await exportGeneration(userId, params.id),
    };
  })
  // Download a snapshot of a shared generation. Lets a recipient pull
  // a portable file without needing the original creator's account.
  .get("/shared/:shareId/export", async ({ params }) => {
    return {
      success: true,
      data: await exportSharedGeneration(params.shareId),
    };
  })
  // Clone a snapshot (uploaded file or pasted JSON) into the current
  // user's account. mode=restore re-hosts the original images; mode=
  // regenerate fires a fresh upstream submission. Returns the new row's
  // id so the client can navigate to /generate/<id>.
  .post(
    "/import",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      const apiKey = getApiKeyOrGuest(cookie);
      return {
        success: true,
        data: await cloneFromSnapshot({
          userId,
          apiKey,
          snapshot: body.snapshot,
          mode: body.mode,
        }),
      };
    },
    { body: generationImportBody },
  )
  // Fork a shared generation into the current user's account. Same
  // result shape as import, just sourced from the share token instead
  // of an uploaded file. Lives under /shared/:shareId/fork so Eden's
  // type surface puts it cleanly under .shared({shareId}).fork.
  .post(
    "/shared/:shareId/fork",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      const apiKey = getApiKeyOrGuest(cookie);
      const snapshot = await exportSharedGeneration(params.shareId);
      return {
        success: true,
        data: await cloneFromSnapshot({
          userId,
          apiKey,
          snapshot,
          mode: body.mode,
        }),
      };
    },
    { body: generationCloneFromShareBody },
  )
  // Reference image upload. Multipart input -> R2 -> URL the form should
  // pass into references[].url on the next /submit. Per-user prefix means
  // refs are reusable across batches without re-upload. v1 imposes no
  // quota; tighten if abuse becomes a problem.
  .post(
    "/references",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
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
  // LoRA catalog. Picker query: visible LoRAs filtered by the selected
  // model's family, optionally faceted by category. Public read; only
  // admin-curated rows ever appear (no user-uploaded LoRAs in v1, so
  // there's no per-user filter).
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
  );
