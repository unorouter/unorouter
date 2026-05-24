"use client";

import { arrayBufferToBase64 } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import {
  type Media,
  type Playground,
  media,
  playgrounds,
  playgroundSessions,
} from "@/lib/db/schema/shared";
import type { PlaygroundImageView, SnapshotView } from "@/lib/types";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getLocalDb } from "../client";
import { makeTableStore, replaceChildRows } from "./table-store";

import type { LocalAnyRow as AnyRow } from "@/lib/types";

type SnapshotInput = Record<string, unknown> & { id: string; sessionId: string };
type MediaInput = typeof media.$inferInsert;

// base64 priority, R2 URL fallback. A freshly-generated image has dataBase64;
// a synced row pulled from another device carries only r2Url.
function resolveImageSrc(row: Media): string | null {
  if (row.dataBase64) {
    return `data:${row.mimeType ?? "image/png"};base64,${row.dataBase64}`;
  }
  return row.r2Url ?? null;
}

function toImageView(row: Media): PlaygroundImageView | null {
  const src = resolveImageSrc(row);
  if (!src) return null;
  return {
    id: row.id,
    sequenceIndex: row.sequenceIndex ?? 0,
    src,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
  };
}

export function toSnapshotView(
  snapshot: Playground,
  images: Media[],
): SnapshotView {
  return {
    id: snapshot.id,
    sessionId: snapshot.sessionId,
    sessionOrder: snapshot.sessionOrder,
    model: snapshot.model,
    prompt: snapshot.prompt,
    negativePrompt: snapshot.negativePrompt,
    params: (snapshot.params as Record<string, unknown> | null) ?? null,
    loras: snapshot.loras,
    references: snapshot.references,
    extraParams:
      (snapshot.extraParams as Record<string, unknown> | null) ?? null,
    status: snapshot.status,
    progress: snapshot.progress,
    taskId: snapshot.taskId,
    requestedCount: snapshot.requestedCount,
    errorMessage: snapshot.errorMessage,
    expiresAt: snapshot.expiresAt,
    createdAt: snapshot.createdAt,
    images: images
      .filter((img) => img.playgroundId === snapshot.id)
      .sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0))
      .map(toImageView)
      .filter((v): v is PlaygroundImageView => v != null),
  };
}

const generationSessionStore = makeTableStore(
  playgroundSessions,
  playgroundSessions.id,
  { defaultOrderBy: desc(playgroundSessions.updatedAt) },
);
const snapshotStore = makeTableStore(playgrounds, playgrounds.id);
const mediaStore = makeTableStore(media, media.id);

export const readLocalGenerationSessions = (userId: number | undefined) =>
  generationSessionStore.list(userId);

export const readLocalGenerationSession = (
  userId: number | undefined,
  id: string,
) => generationSessionStore.get(userId, id);

export const upsertLocalGenerationSession = (
  userId: number | undefined,
  row: AnyRow,
) => generationSessionStore.upsert(userId, row);

export const deleteLocalGenerationSession = (
  userId: number | undefined,
  id: string,
) => generationSessionStore.drop(userId, id);

export const readLocalSnapshot = (userId: number | undefined, id: string) =>
  snapshotStore.get(userId, id);

export const upsertLocalSnapshot = (
  userId: number | undefined,
  row: SnapshotInput,
) => snapshotStore.upsert(userId, row);

export const deleteLocalSnapshot = (userId: number | undefined, id: string) =>
  snapshotStore.drop(userId, id);

// Additive count bumps so concurrent submits don't clobber each other; the
// max(0, ...) floor covers negative deltas from snapshot deletion.
export async function bumpLocalSessionCounts(
  userId: number | undefined,
  sessionId: string,
  delta: { snapshots?: number; images?: number },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .update(playgroundSessions)
    .set({
      snapshotCount: sql`max(0, ${playgroundSessions.snapshotCount} + ${delta.snapshots ?? 0})`,
      imageCount: sql`max(0, ${playgroundSessions.imageCount} + ${delta.images ?? 0})`,
      updatedAt: new Date(),
    })
    .where(eq(playgroundSessions.id, sessionId));
}

// Generation images live in `media` keyed by playgroundId, ordered by batch
// position. Replaces the whole set so a poll retry can't leave stale rows.
export async function readLocalSnapshotImages(
  userId: number | undefined,
  playgroundId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return [];
  return local.db
    .select()
    .from(media)
    .where(eq(media.playgroundId, playgroundId))
    .orderBy(asc(media.sequenceIndex));
}

export async function upsertLocalSnapshotImages(
  userId: number | undefined,
  playgroundId: string,
  images: MediaInput[],
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  const uid = userId ?? 0;
  await replaceChildRows(
    local.db,
    media,
    media.playgroundId,
    playgroundId,
    images,
    (row) => ({ ...row, userId: uid }),
  );
}

// base64-priority: return the local cache if present; otherwise fetch the R2
// URL (a synced row only carries the pointer), cache the base64 back, return.
export async function readLocalGenerationImage(
  userId: number | undefined,
  mediaId: string,
): Promise<string | null> {
  const row = await mediaStore.get(userId, mediaId);
  if (!row) return null;
  if (row.dataBase64) return row.dataBase64;
  if (!row.r2Url) return null;
  try {
    const res = await fetch(row.r2Url);
    if (!res.ok) {
      logger.warn("R2 generation image fetch failed", {
        context: "local-db.playground",
        id: mediaId,
        status: res.status,
      });
      return null;
    }
    const base64 = arrayBufferToBase64(await res.arrayBuffer());
    await mediaStore.upsert(userId, { ...row, dataBase64: base64 });
    return base64;
  } catch (err) {
    logger.warn("R2 generation image rehydrate failed", {
      context: "local-db.playground",
      id: mediaId,
      error: String(err),
    });
    return null;
  }
}

export async function readLocalGenerationSessionBundle(
  userId: number | undefined,
  sessionId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const session = await readLocalGenerationSession(userId, sessionId);
  if (!session) return null;
  const gens = await local.db
    .select()
    .from(playgrounds)
    .where(eq(playgrounds.sessionId, sessionId))
    .orderBy(asc(playgrounds.sessionOrder));
  const genIds = gens.map((g) => g.id);
  const images = genIds.length
    ? await local.db
        .select()
        .from(media)
        .where(inArray(media.playgroundId, genIds))
        .orderBy(asc(media.sequenceIndex))
    : [];
  return { session, playgrounds: gens, media: images };
}

export async function upsertLocalGenerationSessionBundle(
  userId: number | undefined,
  bundle: {
    session: AnyRow;
    playgrounds: AnyRow[];
    media: MediaInput[];
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await generationSessionStore.upsert(userId, bundle.session);

  await replaceChildRows(
    local.db,
    playgrounds,
    playgrounds.sessionId,
    bundle.session.id,
    bundle.playgrounds,
  );

  for (const m of bundle.media) {
    await mediaStore.upsert(userId, m);
  }
}
