import { getV1VideoGenerationsTaskId } from "@/openapi";
import {
  isTerminalTaskStatus,
  normalizeTaskStatus,
  unwrapTaskData,
  type UpstreamFetchResp,
} from "@/lib/api/video-task";
import { downloadAndUploadGeneration } from "@/lib/config/r2";
import { assertFound } from "@/lib/db/assertions";
import { getDb } from "@/lib/db/client";
import {
  generationImages,
  generationSessions,
  generations,
  type Generation,
  type GenerationImage,
  type GenerationSession,
} from "@/lib/db/schema";
import type { GenerationHistoryQuery } from "@/lib/validation/generation";
import dayjs from "dayjs";
import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import {
  finalizeRowFailure,
  finalizeRowSuccess,
  type ImagePayload,
} from "./generation-finalize";

export async function getSnapshotRow(
  userId: number,
  id: string,
): Promise<Generation> {
  const db = getDb();
  const rows = await db
    .select()
    .from(generations)
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .limit(1);
  assertFound(rows);
  return rows[0];
}

export async function getSnapshotWithImages(userId: number, id: string) {
  const row = await getSnapshotRow(userId, id);
  const images = await listGenerationImages(id);
  return { ...row, images };
}

export async function listGenerationImages(
  generationId: string,
): Promise<GenerationImage[]> {
  const db = getDb();
  return db
    .select()
    .from(generationImages)
    .where(eq(generationImages.generationId, generationId))
    .orderBy(asc(generationImages.sequenceIndex));
}

export async function getSessionRow(
  userId: number,
  sessionId: string,
): Promise<GenerationSession> {
  const db = getDb();
  const rows = await db
    .select()
    .from(generationSessions)
    .where(
      and(
        eq(generationSessions.id, sessionId),
        eq(generationSessions.userId, userId),
      ),
    )
    .limit(1);
  assertFound(rows);
  return rows[0];
}

/** Full session payload for the chevron view: the session row + every
 *  snapshot it contains, newest first, each with its images bulk-loaded. */
export async function getSession(userId: number, sessionId: string) {
  const session = await getSessionRow(userId, sessionId);
  const snapshots = await listSnapshotsWithImages(sessionId);
  return { session, snapshots };
}

export async function listSnapshotsWithImages(sessionId: string) {
  const db = getDb();
  const snaps = await db
    .select()
    .from(generations)
    .where(eq(generations.sessionId, sessionId))
    .orderBy(desc(generations.sessionOrder));
  if (snaps.length === 0) return [];
  const ids = snaps.map((s) => s.id);
  const imageRows = await db
    .select()
    .from(generationImages)
    .where(inArray(generationImages.generationId, ids))
    .orderBy(asc(generationImages.sequenceIndex));
  const byGen = new Map<string, GenerationImage[]>();
  for (const img of imageRows) {
    const list = byGen.get(img.generationId);
    if (list) list.push(img);
    else byGen.set(img.generationId, [img]);
  }
  return snaps.map((s) => ({ ...s, images: byGen.get(s.id) ?? [] }));
}

/** Session list for the recent panel / sidebar rail. Each row carries the
 *  latest snapshot + that snapshot's first image so the card can render
 *  without a second roundtrip. */
export async function listUserSessions(
  userId: number,
  q: GenerationHistoryQuery,
) {
  const db = getDb();
  const limit = q.limit ?? 30;
  const conds = [eq(generationSessions.userId, userId)];
  if (q.cursor) {
    const cursorMs = Number(q.cursor);
    if (Number.isFinite(cursorMs)) {
      conds.push(lt(generationSessions.updatedAt, new Date(cursorMs)));
    }
  }
  const sessionRows = await db
    .select()
    .from(generationSessions)
    .where(and(...conds))
    .orderBy(desc(generationSessions.updatedAt))
    .limit(limit + 1);
  const hasMore = sessionRows.length > limit;
  const items = hasMore ? sessionRows.slice(0, limit) : sessionRows;
  const nextCursor = hasMore
    ? String(items[items.length - 1].updatedAt.getTime())
    : null;

  if (items.length === 0) return { items: [], nextCursor };

  // Pull the latest snapshot per session in one query: filter by session
  // ids, sort by sessionOrder DESC, take the first one we see for each id.
  const sessionIds = items.map((s) => s.id);
  let modelFilteredSessionIds = sessionIds;
  if (q.model) {
    const filteredRows = await db
      .select({ sessionId: generations.sessionId })
      .from(generations)
      .where(
        and(
          inArray(generations.sessionId, sessionIds),
          eq(generations.model, q.model),
        ),
      )
      .groupBy(generations.sessionId);
    modelFilteredSessionIds = filteredRows.map((r) => r.sessionId);
  }
  const snapshotRows = await db
    .select()
    .from(generations)
    .where(inArray(generations.sessionId, modelFilteredSessionIds))
    .orderBy(desc(generations.sessionOrder));
  const latestBySession = new Map<string, Generation>();
  for (const s of snapshotRows) {
    if (!latestBySession.has(s.sessionId)) latestBySession.set(s.sessionId, s);
  }

  const snapshotIds = Array.from(latestBySession.values()).map((s) => s.id);
  const imageRows =
    snapshotIds.length > 0
      ? await db
          .select()
          .from(generationImages)
          .where(inArray(generationImages.generationId, snapshotIds))
          .orderBy(asc(generationImages.sequenceIndex))
      : [];
  const firstImageByGen = new Map<string, GenerationImage>();
  for (const img of imageRows) {
    if (!firstImageByGen.has(img.generationId))
      firstImageByGen.set(img.generationId, img);
  }

  const filtered = q.model
    ? items.filter((s) => latestBySession.has(s.id))
    : items;
  return {
    items: filtered.map((s) => {
      const latest = latestBySession.get(s.id) ?? null;
      const firstImage = latest
        ? (firstImageByGen.get(latest.id) ?? null)
        : null;
      return { session: s, latestSnapshot: latest, latestImage: firstImage };
    }),
    nextCursor,
  };
}

// Poll one snapshot's status from upstream. Same flow as before but it
// passes the snapshot's sessionId to finalizeRowSuccess so the parent
// session's image count is bumped when terminal.
export async function pollSnapshotStatus(
  userId: number,
  apiKey: string,
  id: string,
) {
  const db = getDb();
  const current = await getSnapshotRow(userId, id);
  if (isTerminalTaskStatus(current.status))
    return getSnapshotWithImages(userId, id);
  if (!current.taskId) return getSnapshotWithImages(userId, id);

  const res = await getV1VideoGenerationsTaskId(current.taskId, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = unwrapTaskData<UpstreamFetchResp>(res.data);
  const status = normalizeTaskStatus(payload?.status);
  const progress = payload?.progress ?? current.progress ?? "0%";

  if (status === "failure") {
    await finalizeRowFailure(db, id, payload?.fail_reason ?? "", { progress });
    return getSnapshotWithImages(userId, id);
  }

  if (status !== "success") {
    await db
      .update(generations)
      .set({ status, progress, updatedAt: dayjs().toDate() })
      .where(eq(generations.id, id));
    return getSnapshotWithImages(userId, id);
  }

  const upstreamUrls: string[] =
    payload?.result_urls && payload.result_urls.length > 0
      ? payload.result_urls.filter(
          (u): u is string => typeof u === "string" && u.length > 0,
        )
      : payload?.result_url
        ? [payload.result_url]
        : [];

  if (upstreamUrls.length === 0) {
    await finalizeRowFailure(db, id, "upstream success without result url(s)", {
      progress,
    });
    return getSnapshotWithImages(userId, id);
  }

  const collected: ImagePayload[] = [];
  for (const u of upstreamUrls) {
    const uploaded = await downloadAndUploadGeneration(u, id, apiKey);
    collected.push({ resultUri: u, uploaded });
  }
  await finalizeRowSuccess(db, id, current.sessionId, collected);
  return getSnapshotWithImages(userId, id);
}
