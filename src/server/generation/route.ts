import { uploadReferenceToR2 } from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import { loraCatalog } from "@/lib/db/schema";
import {
  generationHistoryQuery,
  generationReferenceUploadBody,
  generationSubmitBody,
  generationVisibilityBody,
  loraCatalogQuery,
} from "@/lib/validation/generation";
import { getApiKeyOrGuest, getUserId } from "@/server/constants";
import { and, asc, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import {
  deleteGeneration,
  getGenerationWithImages,
  listUserGenerations,
  pollGenerationStatus,
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
