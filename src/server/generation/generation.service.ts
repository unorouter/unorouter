import { getModelFixedPrice } from "@/lib/api/pricing-cache";
import { dollarsToQuota } from "@/lib/config/constants";
import {
  chooseEndpoint,
  type SyncImageEndpoint,
} from "@/lib/config/generation-models-dynamic";
import { getModelEndpointTypes } from "@/lib/api/pricing-cache";
import { getDb } from "@/lib/db/server/client";
import {
  generationSessions,
  generations,
  type GenerationSession,
} from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { GenerationSubmitBody } from "@/lib/validation/generation";
import dayjs from "dayjs";
import { eq, sql } from "drizzle-orm";
import { finalizeRowFailure, imageCountFor } from "./generation-finalize";
import { getSessionRow, getSnapshotWithImages } from "./generation-reads";
import { submitComfyUITask } from "./generation-submit-comfyui";
import { submitSyncImage } from "./generation-submit-sync";

// Retention window: a session (and all its snapshots/images) is removed by
// the background sweeper once it crosses this age without new activity.
// Every fresh snapshot extends `expiresAt = now + RETENTION_MS`, so an
// actively used session never expires.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// ComfyUI templates live behind new-api's task adapter (channel type 59);
// they aren't in /api/pricing as image models. Treat them as "comfyui-task"
// when resolving the submission shape.
const COMFYUI_TEMPLATE_IDS = new Set([
  "pony",
  "endgame",
  "comfyui-sdxl-txt2img-lora",
  "flux2-dev",
  "flux2-dev-compose",
]);

type ResolvedEndpoint =
  | { kind: "comfyui-task" }
  | { kind: "sync"; endpoint: SyncImageEndpoint };

async function resolveSubmissionEndpoint(
  model: string,
): Promise<ResolvedEndpoint> {
  if (COMFYUI_TEMPLATE_IDS.has(model)) return { kind: "comfyui-task" };
  const types = await getModelEndpointTypes(model);
  if (!types) {
    throw new Error(`model ${model} not in catalog`);
  }
  const endpoint = chooseEndpoint(types);
  if (!endpoint) {
    throw new Error(`model ${model} declares no supported endpoint`);
  }
  return { kind: "sync", endpoint };
}

// ---------------------------------------------------------------------------
// Submit + dispatch
// ---------------------------------------------------------------------------

export async function submitGeneration(
  userId: number,
  apiKey: string,
  body: GenerationSubmitBody & { sessionId?: string },
) {
  const db = getDb();
  const visibility = body.visibility ?? "private";
  const nsfw = body.nsfw ?? true;
  const requestedCount = imageCountFor(body);
  const costQuota =
    dollarsToQuota(await getModelFixedPrice(body.model)) * requestedCount;
  const now = Date.now();
  const expiresAt = new Date(now + RETENTION_MS);

  // Resolve the parent session. If the client sent a sessionId, append to
  // it (verify ownership). Otherwise create a fresh session that this
  // snapshot opens.
  let sessionId: string;
  let sessionOrder: number;
  let createdSession: GenerationSession | undefined;
  if (body.sessionId) {
    const existing = await getSessionRow(userId, body.sessionId);
    sessionId = existing.id;
    sessionOrder = existing.snapshotCount;
  } else {
    sessionId = uid();
    sessionOrder = 0;
    const title = body.prompt.slice(0, 60).trim() || null;
    await db.insert(generationSessions).values({
      id: sessionId,
      userId,
      title,
      firstModel: body.model,
      snapshotCount: 0,
      imageCount: 0,
      expiresAt,
    });
    createdSession = (
      await db
        .select()
        .from(generationSessions)
        .where(eq(generationSessions.id, sessionId))
        .limit(1)
    )[0];
  }

  const id = uid();
  await db.insert(generations).values({
    id,
    userId,
    sessionId,
    sessionOrder,
    requestedCount,
    model: body.model,
    prompt: body.prompt,
    negativePrompt: body.negativePrompt,
    params: body.params ?? null,
    loras: body.loras ?? null,
    references: body.references ?? null,
    extraParams: body.extraParams ?? null,
    status: "pending",
    visibility,
    nsfw,
    costQuota,
    expiresAt,
    submittedKey: apiKey,
  });

  // Bump the session counters + extend retention. Append-only counter
  // bumps stay safe under concurrent submits (SQL increment).
  await db
    .update(generationSessions)
    .set({
      snapshotCount: sql`${generationSessions.snapshotCount} + 1`,
      expiresAt,
      updatedAt: dayjs().toDate(),
    })
    .where(eq(generationSessions.id, sessionId));

  const resolved = await resolveSubmissionEndpoint(body.model);

  try {
    if (resolved.kind === "comfyui-task") {
      await submitComfyUITask({
        db,
        id,
        sessionId,
        apiKey,
        body,
        n: requestedCount,
      });
    } else {
      await submitSyncImage({
        db,
        id,
        sessionId,
        apiKey,
        body,
        endpoint: resolved.endpoint,
        n: requestedCount,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("generation submit failed", {
      context: "generation.submit",
      generationId: id,
      sessionId,
      model: body.model,
      err: message,
    });
    await finalizeRowFailure(db, id, message);
    throw err;
  }

  const snapshot = await getSnapshotWithImages(userId, id);
  // Fetch session fresh so the response includes the latest counts after
  // the bumps above.
  const session = createdSession
    ? (
        await db
          .select()
          .from(generationSessions)
          .where(eq(generationSessions.id, sessionId))
          .limit(1)
      )[0]
    : (
        await db
          .select()
          .from(generationSessions)
          .where(eq(generationSessions.id, sessionId))
          .limit(1)
      )[0];
  return { session, snapshot };
}

// ---------------------------------------------------------------------------
// Re-exports: all public API stays accessible from this file
// ---------------------------------------------------------------------------

export {
  getSnapshotWithImages,
  getSession,
  listUserSessions,
  pollSnapshotStatus,
} from "./generation-reads";
export {
  setVisibility,
  deleteSnapshot,
  deleteSession,
  deleteSessionAsSystem,
  listExpiredSessionIds,
} from "./generation-deletes";
export {
  exportSession,
  cloneFromPayload,
  type GenerationSnapshot,
  type SessionSnapshot,
  type CloneMode,
} from "./generation-export-clone";
