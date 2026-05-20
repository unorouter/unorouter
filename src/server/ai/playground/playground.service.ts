import { getPricingSummary } from "@/lib/api/pricing-cache";
import { dollarsToQuota } from "@/lib/config/constants";
import {
  chooseEndpoint,
  type SyncImageEndpoint,
} from "@/lib/ai/playground/models-dynamic";
import { getDb } from "@/lib/db/server/client";
import {
  playgroundSessions,
  playgrounds,
  type PlaygroundSession,
} from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { PlaygroundSubmitBody } from "@/lib/validation/playground";
import dayjs from "dayjs";
import { eq, sql } from "drizzle-orm";
import { finalizeRowFailure, imageCountFor } from "./playground-finalize";
import { getSessionRow, getSnapshotWithImages } from "./playground-reads";
import { submitComfyUITask } from "./playground-submit-comfyui";
import { submitSyncImage } from "./playground-submit-sync";

// Each fresh snapshot extends expiresAt; actively-used sessions never expire.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// ComfyUI templates live behind new-api's task adapter (channel type 59).
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
  const info = (await getPricingSummary()).models.find((m) => m.name === model);
  if (!info) {
    throw new Error(`model ${model} not in catalog`);
  }
  const endpoint = chooseEndpoint(info.endpointTypes ?? []);
  if (!endpoint) {
    throw new Error(`model ${model} declares no supported endpoint`);
  }
  return { kind: "sync", endpoint };
}

export async function submitGeneration(
  userId: number,
  apiKey: string,
  body: PlaygroundSubmitBody & { sessionId?: string },
) {
  const db = getDb();
  const visibility = body.visibility ?? "private";
  const nsfw = body.nsfw ?? true;
  const requestedCount = imageCountFor(body);
  const modelInfo = (await getPricingSummary()).models.find(
    (m) => m.name === body.model,
  );
  const fixedPrice = modelInfo?.isFixedPrice ? (modelInfo.fixedPrice ?? 0) : 0;
  const costQuota = dollarsToQuota(fixedPrice) * requestedCount;
  const now = Date.now();
  const expiresAt = new Date(now + RETENTION_MS);

  let sessionId: string;
  let sessionOrder: number;
  let createdSession: PlaygroundSession | undefined;
  if (body.sessionId) {
    const existing = await getSessionRow(userId, body.sessionId);
    sessionId = existing.id;
    sessionOrder = existing.snapshotCount;
  } else {
    sessionId = uid();
    sessionOrder = 0;
    const title = body.prompt.slice(0, 60).trim() || null;
    await db.insert(playgroundSessions).values({
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
        .from(playgroundSessions)
        .where(eq(playgroundSessions.id, sessionId))
        .limit(1)
    )[0];
  }

  const id = uid();
  await db.insert(playgrounds).values({
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

  // SQL increment is safe under concurrent submits.
  await db
    .update(playgroundSessions)
    .set({
      snapshotCount: sql`${playgroundSessions.snapshotCount} + 1`,
      expiresAt,
      updatedAt: dayjs().toDate(),
    })
    .where(eq(playgroundSessions.id, sessionId));

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
    logger.error("playground submit failed", {
      context: "playground.submit",
      playgroundId: id,
      sessionId,
      model: body.model,
      err: message,
    });
    await finalizeRowFailure(db, id, message);
    throw err;
  }

  const snapshot = await getSnapshotWithImages(userId, id);
  const session = createdSession
    ? (
        await db
          .select()
          .from(playgroundSessions)
          .where(eq(playgroundSessions.id, sessionId))
          .limit(1)
      )[0]
    : (
        await db
          .select()
          .from(playgroundSessions)
          .where(eq(playgroundSessions.id, sessionId))
          .limit(1)
      )[0];
  return { session, snapshot };
}

export {
  getSnapshotWithImages,
  getSession,
  listUserSessions,
  pollSnapshotStatus,
} from "./playground-reads";
export {
  setVisibility,
  deleteSnapshot,
  deleteSession,
  deleteSessionAsSystem,
  listExpiredSessionIds,
} from "./playground-deletes";
export {
  exportSession,
  cloneFromPayload,
  type PlaygroundSnapshot,
  type SessionSnapshot,
  type CloneMode,
} from "./playground-export-clone";
