import { msg } from "@/lib/config/constants";
import { deleteGenerationObject } from "@/lib/config/r2";
import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import {
  generationImages,
  generationSessions,
  generations,
} from "@/lib/db/schema";
import { logger } from "@/lib/utils/logger";
import type { GenerationVisibility } from "@/lib/validation/generation";
import dayjs from "dayjs";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import {
  getSessionRow,
  getSnapshotRow,
  getSnapshotWithImages,
  listGenerationImages,
} from "./generation-reads";

export async function setVisibility(
  userId: number,
  id: string,
  visibility: GenerationVisibility,
) {
  const db = getDb();
  if (visibility === "public") {
    const existing = await getSnapshotRow(userId, id);
    if (existing.nsfw) {
      throw new Error(msg("ERRORS.NSFW_NOT_PUBLISHABLE"));
    }
  }
  const result = await db
    .update(generations)
    .set({ visibility, updatedAt: dayjs().toDate() })
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .returning({ id: generations.id });
  assertFound(result);
  return getSnapshotWithImages(userId, id);
}

// ---------------------------------------------------------------------------
// Deletes: snapshot vs whole session
// ---------------------------------------------------------------------------

/** Delete one snapshot. R2 objects are unlinked first, then the row drops.
 *  If the deletion empties the parent session, cascade-delete the session
 *  too so we don't leak empty rows. */
export async function deleteSnapshot(userId: number, id: string) {
  const db = getDb();
  const snapshot = await getSnapshotRow(userId, id);
  const images = await listGenerationImages(id);
  for (const img of images) {
    try {
      await deleteGenerationObject(img.r2Key);
    } catch (err) {
      logger.warn("r2 delete failed", {
        context: "generation.snapshot.delete",
        generationId: id,
        r2Key: img.r2Key,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  await db
    .delete(generations)
    .where(and(eq(generations.id, id), eq(generations.userId, userId)));

  // Decrement parent counts. If the session is now empty, drop it; else
  // refresh updatedAt so the list re-sorts away from the dead snapshot.
  const remaining = await db
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(eq(generations.sessionId, snapshot.sessionId));
  const remainingCount = Number(remaining[0]?.count ?? 0);
  if (remainingCount === 0) {
    await db
      .delete(generationSessions)
      .where(eq(generationSessions.id, snapshot.sessionId));
  } else {
    await db
      .update(generationSessions)
      .set({
        snapshotCount: sql`${generationSessions.snapshotCount} - 1`,
        imageCount: sql`${generationSessions.imageCount} - ${images.length}`,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(generationSessions.id, snapshot.sessionId));
  }
  return {
    id,
    sessionId: snapshot.sessionId,
    sessionDeleted: remainingCount === 0,
  };
}

/** Delete an entire session: every snapshot's R2 objects, then the session
 *  row (snapshots + images cascade via FK). */
export async function deleteSession(userId: number, sessionId: string) {
  const db = getDb();
  await getSessionRow(userId, sessionId);
  const snapshots = await db
    .select({ id: generations.id })
    .from(generations)
    .where(eq(generations.sessionId, sessionId));
  if (snapshots.length > 0) {
    const imgs = await db
      .select()
      .from(generationImages)
      .where(
        inArray(
          generationImages.generationId,
          snapshots.map((s) => s.id),
        ),
      );
    for (const img of imgs) {
      try {
        await deleteGenerationObject(img.r2Key);
      } catch (err) {
        logger.warn("r2 delete failed", {
          context: "generation.session.delete",
          sessionId,
          r2Key: img.r2Key,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  await db
    .delete(generationSessions)
    .where(eq(generationSessions.id, sessionId));
  return { id: sessionId };
}

/** Sweeper-friendly delete: skip ownership check. */
export async function deleteSessionAsSystem(sessionId: string) {
  const db = getDb();
  const snapshots = await db
    .select({ id: generations.id })
    .from(generations)
    .where(eq(generations.sessionId, sessionId));
  if (snapshots.length > 0) {
    const imgs = await db
      .select()
      .from(generationImages)
      .where(
        inArray(
          generationImages.generationId,
          snapshots.map((s) => s.id),
        ),
      );
    for (const img of imgs) {
      try {
        await deleteGenerationObject(img.r2Key);
      } catch (err) {
        logger.warn("r2 delete failed (sweeper)", {
          context: "generation.sweep.session",
          sessionId,
          r2Key: img.r2Key,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  await db
    .delete(generationSessions)
    .where(eq(generationSessions.id, sessionId));
}

export async function listExpiredSessionIds(
  limit: number = 100,
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ id: generationSessions.id })
    .from(generationSessions)
    .where(lt(generationSessions.expiresAt, new Date()))
    .limit(limit);
  return rows.map((r) => r.id);
}
