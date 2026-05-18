import { getV1VideoGenerationsTaskId } from "@/openapi";
import {
  normalizeTaskStatus,
  unwrapTaskData,
  type UpstreamFetchResp,
} from "@/lib/api/video-task";
import { downloadAndUploadGeneration } from "@/lib/config/r2";
import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import {
  playgroundImages,
  playgroundSessions,
  playgrounds,
  type Playground,
  type PlaygroundImage,
  type PlaygroundSession,
} from "@/lib/db/schema";
import type { PlaygroundHistoryQuery } from "@/lib/validation/playground";
import dayjs from "dayjs";
import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import {
  finalizeRowFailure,
  finalizeRowSuccess,
  type ImagePayload,
} from "./playground-finalize";

export async function getSnapshotRow(
  userId: number,
  id: string,
): Promise<Playground> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playgrounds)
    .where(and(eq(playgrounds.id, id), eq(playgrounds.userId, userId)))
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
  playgroundId: string,
): Promise<PlaygroundImage[]> {
  const db = getDb();
  return db
    .select()
    .from(playgroundImages)
    .where(eq(playgroundImages.playgroundId, playgroundId))
    .orderBy(asc(playgroundImages.sequenceIndex));
}

export async function getSessionRow(
  userId: number,
  sessionId: string,
): Promise<PlaygroundSession> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playgroundSessions)
    .where(
      and(
        eq(playgroundSessions.id, sessionId),
        eq(playgroundSessions.userId, userId),
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
    .from(playgrounds)
    .where(eq(playgrounds.sessionId, sessionId))
    .orderBy(desc(playgrounds.sessionOrder));
  if (snaps.length === 0) return [];
  const ids = snaps.map((s) => s.id);
  const imageRows = await db
    .select()
    .from(playgroundImages)
    .where(inArray(playgroundImages.playgroundId, ids))
    .orderBy(asc(playgroundImages.sequenceIndex));
  const byGen = new Map<string, PlaygroundImage[]>();
  for (const img of imageRows) {
    const list = byGen.get(img.playgroundId);
    if (list) list.push(img);
    else byGen.set(img.playgroundId, [img]);
  }
  return snaps.map((s) => ({ ...s, images: byGen.get(s.id) ?? [] }));
}

/** Session list for the recent panel / sidebar rail. Each row carries the
 *  latest snapshot + that snapshot's first image so the card can render
 *  without a second roundtrip. */
export async function listUserSessions(
  userId: number,
  q: PlaygroundHistoryQuery,
) {
  const db = getDb();
  const limit = q.limit ?? 30;
  const conds = [eq(playgroundSessions.userId, userId)];
  if (q.cursor) {
    const cursorMs = Number(q.cursor);
    if (Number.isFinite(cursorMs)) {
      conds.push(lt(playgroundSessions.updatedAt, new Date(cursorMs)));
    }
  }
  const sessionRows = await db
    .select()
    .from(playgroundSessions)
    .where(and(...conds))
    .orderBy(desc(playgroundSessions.updatedAt))
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
      .select({ sessionId: playgrounds.sessionId })
      .from(playgrounds)
      .where(
        and(
          inArray(playgrounds.sessionId, sessionIds),
          eq(playgrounds.model, q.model),
        ),
      )
      .groupBy(playgrounds.sessionId);
    modelFilteredSessionIds = filteredRows.map((r) => r.sessionId);
  }
  const snapshotRows = await db
    .select()
    .from(playgrounds)
    .where(inArray(playgrounds.sessionId, modelFilteredSessionIds))
    .orderBy(desc(playgrounds.sessionOrder));
  const latestBySession = new Map<string, Playground>();
  for (const s of snapshotRows) {
    if (!latestBySession.has(s.sessionId)) latestBySession.set(s.sessionId, s);
  }

  const snapshotIds = Array.from(latestBySession.values()).map((s) => s.id);
  const imageRows =
    snapshotIds.length > 0
      ? await db
          .select()
          .from(playgroundImages)
          .where(inArray(playgroundImages.playgroundId, snapshotIds))
          .orderBy(asc(playgroundImages.sequenceIndex))
      : [];
  const firstImageByGen = new Map<string, PlaygroundImage>();
  for (const img of imageRows) {
    if (!firstImageByGen.has(img.playgroundId))
      firstImageByGen.set(img.playgroundId, img);
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
  const currentStatus = current.status?.toLowerCase();
  if (currentStatus === "success" || currentStatus === "failure")
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
      .update(playgrounds)
      .set({ status, progress, updatedAt: dayjs().toDate() })
      .where(eq(playgrounds.id, id));
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
