import { downloadAndUploadGeneration } from "@/lib/config/r2";
import { assertFound } from "@/lib/db/assertions";
import { getDb } from "@/lib/db/client";
import {
  generationSessions,
  generations,
  type Generation,
  type GenerationImage,
} from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { GenerationSubmitBody } from "@/lib/validation/generation";
import dayjs from "dayjs";
import { eq, sql } from "drizzle-orm";
import {
  finalizeRowFailure,
  finalizeRowSuccess,
  type ImagePayload,
} from "./generation-finalize";
import { getSessionRow, listSnapshotsWithImages } from "./generation-reads";
import { submitGeneration } from "./generation.service";

// Retention window: a session (and all its snapshots/images) is removed by
// the background sweeper once it crosses this age without new activity.
// Every fresh snapshot extends `expiresAt = now + RETENTION_MS`, so an
// actively used session never expires.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Export / Import / Clone
// ---------------------------------------------------------------------------

export type GenerationSnapshot = {
  version: "unorouter-generation-1";
  model: string;
  prompt: string;
  negativePrompt: string | null;
  params: unknown;
  loras: unknown;
  references: unknown;
  extraParams: unknown;
  nsfw: boolean;
  images: Array<{
    sequenceIndex: number;
    r2Url: string;
    mimeType: string | null;
    width: number | null;
    height: number | null;
  }>;
};

export type SessionSnapshot = {
  version: "unorouter-session-1";
  session: { title: string | null; firstModel: string | null };
  snapshots: GenerationSnapshot[];
};

export type CloneMode = "restore" | "regenerate";

function rowToSnapshot(
  row: Generation,
  images: GenerationImage[],
): GenerationSnapshot {
  return {
    version: "unorouter-generation-1",
    model: row.model,
    prompt: row.prompt,
    negativePrompt: row.negativePrompt,
    params: row.params,
    loras: row.loras,
    references: row.references,
    extraParams: row.extraParams,
    nsfw: row.nsfw,
    images: images.map((img) => ({
      sequenceIndex: img.sequenceIndex,
      r2Url: img.r2Url,
      mimeType: img.mimeType,
      width: img.width,
      height: img.height,
    })),
  };
}

/** Export a whole session. */
export async function exportSession(
  userId: number,
  sessionId: string,
): Promise<SessionSnapshot> {
  const session = await getSessionRow(userId, sessionId);
  const snapshots = await listSnapshotsWithImages(sessionId);
  return {
    version: "unorouter-session-1",
    session: { title: session.title, firstModel: session.firstModel },
    snapshots: snapshots.map((s) => rowToSnapshot(s, s.images)),
  };
}

/** Clone a single-snapshot payload into a new single-snapshot session. */
async function cloneSnapshotIntoNewSession(args: {
  userId: number;
  apiKey: string;
  snapshot: GenerationSnapshot;
  mode: CloneMode;
}): Promise<{ sessionId: string }> {
  const { userId, apiKey, snapshot, mode } = args;
  const db = getDb();
  const now = Date.now();
  const expiresAt = new Date(now + RETENTION_MS);

  if (mode === "regenerate") {
    const body: GenerationSubmitBody = {
      model: snapshot.model,
      prompt: snapshot.prompt,
      negativePrompt: snapshot.negativePrompt ?? undefined,
      params: snapshot.params as GenerationSubmitBody["params"],
      loras: snapshot.loras as GenerationSubmitBody["loras"],
      references: snapshot.references as GenerationSubmitBody["references"],
      extraParams: snapshot.extraParams as Record<string, unknown> | undefined,
      visibility: "private",
      nsfw: snapshot.nsfw,
    };
    const { session } = await submitGeneration(userId, apiKey, body);
    return { sessionId: session.id };
  }

  // restore: build the session + a single success snapshot inline.
  const sessionId = uid();
  const snapshotId = uid();
  const title = snapshot.prompt.slice(0, 60).trim() || null;
  await db.insert(generationSessions).values({
    id: sessionId,
    userId,
    title,
    firstModel: snapshot.model,
    snapshotCount: 1,
    imageCount: 0,
    expiresAt,
  });
  await db.insert(generations).values({
    id: snapshotId,
    userId,
    sessionId,
    sessionOrder: 0,
    requestedCount: Math.max(1, snapshot.images.length),
    model: snapshot.model,
    prompt: snapshot.prompt,
    negativePrompt: snapshot.negativePrompt,
    params: snapshot.params as never,
    loras: snapshot.loras as never,
    references: snapshot.references as never,
    extraParams: snapshot.extraParams as never,
    status: "pending",
    visibility: "private",
    nsfw: snapshot.nsfw,
    costQuota: 0,
    expiresAt,
    submittedKey: apiKey,
  });

  try {
    const collected: ImagePayload[] = [];
    for (const img of snapshot.images) {
      const uploaded = await downloadAndUploadGeneration(
        img.r2Url,
        snapshotId,
        apiKey,
      );
      collected.push({ resultUri: img.r2Url, uploaded });
    }
    if (collected.length === 0) {
      await finalizeRowFailure(db, snapshotId, "snapshot contained no images");
      return { sessionId };
    }
    await finalizeRowSuccess(db, snapshotId, sessionId, collected);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("clone restore failed", {
      context: "generation.clone",
      generationId: snapshotId,
      err: message,
    });
    await finalizeRowFailure(db, snapshotId, message);
    throw err;
  }
  return { sessionId };
}

/** Clone a whole session: restore re-hosts every snapshot's images;
 *  regenerate fires N upstream submits inside one new session. */
async function cloneSessionPayload(args: {
  userId: number;
  apiKey: string;
  payload: SessionSnapshot;
  mode: CloneMode;
}): Promise<{ sessionId: string }> {
  const { userId, apiKey, payload, mode } = args;
  const db = getDb();
  const now = Date.now();
  const expiresAt = new Date(now + RETENTION_MS);

  // Create the empty session up-front; we then iterate snapshots in order.
  const sessionId = uid();
  const title = payload.session.title?.slice(0, 60).trim() || null;
  await db.insert(generationSessions).values({
    id: sessionId,
    userId,
    title,
    firstModel: payload.session.firstModel,
    snapshotCount: 0,
    imageCount: 0,
    expiresAt,
  });

  if (mode === "regenerate") {
    for (const snap of payload.snapshots) {
      const body: GenerationSubmitBody & { sessionId: string } = {
        sessionId,
        model: snap.model,
        prompt: snap.prompt,
        negativePrompt: snap.negativePrompt ?? undefined,
        params: snap.params as GenerationSubmitBody["params"],
        loras: snap.loras as GenerationSubmitBody["loras"],
        references: snap.references as GenerationSubmitBody["references"],
        extraParams: snap.extraParams as Record<string, unknown> | undefined,
        visibility: "private",
        nsfw: snap.nsfw,
      };
      try {
        await submitGeneration(userId, apiKey, body);
      } catch (err) {
        logger.warn("session clone regenerate skipped snapshot", {
          context: "generation.clone.session.regenerate",
          sessionId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { sessionId };
  }

  // restore: insert each snapshot in success state, re-hosting images.
  for (let i = 0; i < payload.snapshots.length; i++) {
    const snap = payload.snapshots[i];
    const snapshotId = uid();
    await db.insert(generations).values({
      id: snapshotId,
      userId,
      sessionId,
      sessionOrder: i,
      requestedCount: Math.max(1, snap.images.length),
      model: snap.model,
      prompt: snap.prompt,
      negativePrompt: snap.negativePrompt,
      params: snap.params as never,
      loras: snap.loras as never,
      references: snap.references as never,
      extraParams: snap.extraParams as never,
      status: "pending",
      visibility: "private",
      nsfw: snap.nsfw,
      costQuota: 0,
      expiresAt,
      submittedKey: apiKey,
    });
    await db
      .update(generationSessions)
      .set({
        snapshotCount: sql`${generationSessions.snapshotCount} + 1`,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(generationSessions.id, sessionId));
    try {
      const collected: ImagePayload[] = [];
      for (const img of snap.images) {
        const uploaded = await downloadAndUploadGeneration(
          img.r2Url,
          snapshotId,
          apiKey,
        );
        collected.push({ resultUri: img.r2Url, uploaded });
      }
      if (collected.length === 0) {
        await finalizeRowFailure(
          db,
          snapshotId,
          "snapshot contained no images",
        );
      } else {
        await finalizeRowSuccess(db, snapshotId, sessionId, collected);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("session clone restore failed snapshot", {
        context: "generation.clone.session.restore",
        sessionId,
        snapshotId,
        err: message,
      });
      await finalizeRowFailure(db, snapshotId, message);
    }
  }
  return { sessionId };
}

/** Dispatch on payload shape. Single-snapshot imports land as a new
 *  session with one snapshot; full-session imports preserve the trail. */
export async function cloneFromPayload(args: {
  userId: number;
  apiKey: string;
  payload: GenerationSnapshot | SessionSnapshot;
  mode: CloneMode;
}): Promise<{ sessionId: string }> {
  if (args.payload.version === "unorouter-session-1") {
    return cloneSessionPayload({
      userId: args.userId,
      apiKey: args.apiKey,
      payload: args.payload,
      mode: args.mode,
    });
  }
  return cloneSnapshotIntoNewSession({
    userId: args.userId,
    apiKey: args.apiKey,
    snapshot: args.payload,
    mode: args.mode,
  });
}
