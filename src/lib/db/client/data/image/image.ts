"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import { base64ToDataUri } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import {
  type ImageSnapshot,
  imageModels,
  imageSessions,
  imageSnapshots,
} from "@/lib/db/schema/client";
import { type Media, media } from "@/lib/db/schema/shared";
import type { ImageView, SnapshotView } from "@/lib/types";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getLocalDb } from "@/lib/db/client/client";
import {
  makeTableStore,
  replaceChildRows,
} from "@/lib/db/client/data/table-store";

import type { LocalAnyRow as AnyRow } from "@/lib/types";

type SnapshotInput = Record<string, unknown> & {
  id: string;
  sessionId: string;
};
type MediaInput = typeof media.$inferInsert;

function toImageView(row: Media): ImageView | null {
  if (!row.dataBase64) return null;
  return {
    id: row.id,
    sequenceIndex: row.sequenceIndex ?? 0,
    src: base64ToDataUri(row.dataBase64, row.mimeType ?? "image/png"),
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
  };
}

export function toSnapshotView(
  snapshot: ImageSnapshot,
  images: Media[],
): SnapshotView {
  return {
    id: snapshot.id,
    sessionId: snapshot.sessionId,
    sessionOrder: snapshot.sessionOrder,
    parentSnapshotId: snapshot.parentSnapshotId,
    model: snapshot.model,
    prompt: snapshot.prompt,
    negativePrompt: snapshot.negativePrompt,
    params: snapshot.params ?? null,
    loras: snapshot.loras,
    references: snapshot.references,
    extraParams: snapshot.extraParams ?? null,
    status: snapshot.status,
    progress: snapshot.progress,
    taskId: snapshot.taskId,
    requestedCount: snapshot.requestedCount,
    costQuota: snapshot.costQuota,
    errorMessage: snapshot.errorMessage,
    expiresAt: snapshot.expiresAt,
    createdAt: snapshot.createdAt,
    images: images
      .filter((img) => img.imageSnapshotId === snapshot.id)
      .sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0))
      .map(toImageView)
      .filter((v): v is ImageView => v != null),
  };
}

const sessionStore = makeTableStore(imageSessions, imageSessions.id, {
  defaultOrderBy: desc(imageSessions.updatedAt),
});
const snapshotStore = makeTableStore(imageSnapshots, imageSnapshots.id);
const mediaStore = makeTableStore(media, media.id);

export const readLocalImageSessions = (userId: number | undefined) =>
  sessionStore.list(userId);

export const readLocalImageSession = (userId: number | undefined, id: string) =>
  sessionStore.get(userId, id);

export const upsertLocalImageSession = (
  userId: number | undefined,
  row: AnyRow,
) => sessionStore.upsert(userId, row);

export const deleteLocalImageSession = (
  userId: number | undefined,
  id: string,
) => sessionStore.drop(userId, id);

export const upsertLocalSnapshot = (
  userId: number | undefined,
  row: SnapshotInput,
) => snapshotStore.upsert(userId, row);

export const deleteLocalSnapshot = (userId: number | undefined, id: string) =>
  snapshotStore.drop(userId, id);

export async function bumpLocalSessionCounts(
  userId: number | undefined,
  sessionId: string,
  delta: { snapshots?: number; images?: number },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .update(imageSessions)
    .set({
      snapshotCount: sql`max(0, ${imageSessions.snapshotCount} + ${delta.snapshots ?? 0})`,
      imageCount: sql`max(0, ${imageSessions.imageCount} + ${delta.images ?? 0})`,
      updatedAt: dayjs().toDate(),
    })
    .where(eq(imageSessions.id, sessionId));
}

export async function upsertLocalSnapshotImages(
  userId: number | undefined,
  snapshotId: string,
  images: MediaInput[],
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  const uid = userId ?? GUEST_USER_ID;
  await replaceChildRows(
    local.db,
    media,
    media.imageSnapshotId,
    snapshotId,
    images,
    (row) => ({ ...row, userId: uid }),
  );
}

export async function readLocalImageBytes(
  userId: number | undefined,
  mediaId: string,
): Promise<string | null> {
  const row = await mediaStore.get(userId, mediaId);
  return row?.dataBase64 ?? null;
}

export async function readLocalSessionBundle(
  userId: number | undefined,
  sessionId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const session = await readLocalImageSession(userId, sessionId);
  if (!session) return null;
  const snapshots = await local.db
    .select()
    .from(imageSnapshots)
    .where(eq(imageSnapshots.sessionId, sessionId))
    .orderBy(asc(imageSnapshots.sessionOrder));
  const ids = snapshots.map((s) => s.id);
  const images = ids.length
    ? await local.db
        .select()
        .from(media)
        .where(inArray(media.imageSnapshotId, ids))
        .orderBy(asc(media.sequenceIndex))
    : [];
  return { session, snapshots, media: images };
}

// Looks the snapshot up by id rather than scanning every session and loading each
// bundle. The poll loop calls this twice a second, and the scan version loaded every
// session's base64 images on each tick.
export async function readLocalSnapshotView(
  userId: number | undefined,
  snapshotId: string,
): Promise<SnapshotView | null> {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const snapshot = await snapshotStore.get(userId, snapshotId);
  if (!snapshot) return null;
  const images = await local.db
    .select()
    .from(media)
    .where(eq(media.imageSnapshotId, snapshotId))
    .orderBy(asc(media.sequenceIndex));
  return toSnapshotView(snapshot, images);
}

export async function readLocalSnapshotBySubmittedKey(
  userId: number | undefined,
  submittedKey: string,
): Promise<ImageSnapshot | null> {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(imageSnapshots)
    .where(eq(imageSnapshots.submittedKey, submittedKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertLocalSessionBundle(
  userId: number | undefined,
  bundle: {
    session: AnyRow;
    snapshots: AnyRow[];
    media: MediaInput[];
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await sessionStore.upsert(userId, bundle.session);

  await replaceChildRows(
    local.db,
    imageSnapshots,
    imageSnapshots.sessionId,
    bundle.session.id,
    bundle.snapshots,
  );

  for (const m of bundle.media) {
    await mediaStore.upsert(userId, m);
  }
}

// Cost is only known after the generation runs, so it is patched onto an existing row.
// A partial upsert would blank every column it did not carry, including the session id.
export async function patchLocalSnapshotCost(
  userId: number | undefined,
  snapshotId: string,
  costQuota: number,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .update(imageSnapshots)
    .set({ costQuota, updatedAt: dayjs().toDate() })
    .where(eq(imageSnapshots.id, snapshotId));
}

const imageModelStore = makeTableStore(imageModels, imageModels.air);

export const readLocalImageModels = (userId: number | undefined) =>
  imageModelStore.list(userId);

export const deleteLocalImageModel = (
  userId: number | undefined,
  air: string,
) => imageModelStore.drop(userId, air);

// Recorded when a checkpoint is actually generated with, so the list stays what the user
// uses rather than everything they searched. Re-generating just moves it back to the top.
export async function rememberLocalImageModel(
  userId: number | undefined,
  model: {
    air: string;
    name: string;
    architecture?: string | null;
    heroImage?: string | null;
    nsfwLevel?: number | null;
  },
) {
  await imageModelStore.upsert(userId, {
    air: model.air,
    name: model.name,
    architecture: model.architecture ?? null,
    heroImage: model.heroImage ?? null,
    nsfwLevel: model.nsfwLevel ?? null,
    lastUsedAt: dayjs().toDate(),
  });
}
