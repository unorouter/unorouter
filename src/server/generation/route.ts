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
      const userId = getUserId(cookie);
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
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await listUserSessions(userId, query),
      };
    },
    { query: generationHistoryQuery },
  )
  // Full session payload for the chevron view.
  .get("/session/:sessionId", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await getSession(userId, params.sessionId),
    };
  })
  // Delete a whole session and every snapshot it contains.
  .delete("/session/:sessionId", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await deleteSession(userId, params.sessionId),
    };
  })
  // Mint a public share token for a session. Idempotent.
  .post("/session/:sessionId/share", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await createShareLink(userId, params.sessionId),
    };
  })
  .delete("/session/:sessionId/share", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await revokeShareLink(userId, params.sessionId),
    };
  })
  // Download a snapshot of a session the user owns (full history).
  .get("/session/:sessionId/export", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await exportSession(userId, params.sessionId),
    };
  })
  // Single snapshot detail (polling read and form-restore source).
  .get("/snapshot/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return {
      success: true,
      data: await getSnapshotWithImages(userId, params.id),
    };
  })
  // Poll upstream + reflect status into the snapshot row.
  .get("/snapshot/:id/status", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
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
      const userId = getUserId(cookie);
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
    const userId = getUserId(cookie);
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
      const userId = getUserId(cookie);
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
      const userId = getUserId(cookie);
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
  );
