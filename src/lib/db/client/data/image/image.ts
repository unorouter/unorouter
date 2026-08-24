"use client";

import {
  mediaBlobUrl,
  revokeMediaBlobUrl,
} from "@/lib/db/client/data/media/blob-url";
import { isRecord } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import {
  type ImageSnapshot,
  imageModels,
  imageSessions,
  imageSnapshots,
} from "@/lib/db/schema/client";
import { type Media, media } from "@/lib/db/schema/shared";
import type { ImageView, LocalClient, SnapshotView } from "@/lib/types";
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
    src: mediaBlobUrl(row.id, row.dataBase64, row.mimeType ?? "image/png"),
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    seed: row.seed,
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

const readLocalImageSessions = () => sessionStore.list();

export const readLocalImageSession = (id: string) => sessionStore.get(id);

export const upsertLocalImageSession = (row: AnyRow) =>
  sessionStore.upsert(row);

export const deleteLocalImageSession = (id: string) => sessionStore.drop(id);

// A snapshot's params carry the img2img source and inpaint mask as base64 data
// URIs up to 8MB each, so kept verbatim every edit stores its INPUT forever on
// top of the output already in `media`. The restore path never reads them back
// (quick actions rebuild the init image from the media row's bytes via
// durableInitUrl), so only https URLs survive here.
function stripInlineImages(row: SnapshotInput): SnapshotInput {
  const params = isRecord(row.params) ? row.params : undefined;
  const extra = isRecord(row.extraParams) ? row.extraParams : undefined;
  const isInline = (v: unknown) =>
    typeof v === "string" && v.startsWith("data:");
  const nextParams =
    params && (isInline(params.initImageUrl) || isInline(params.maskUrl))
      ? { ...params }
      : params;
  if (nextParams && nextParams !== params) {
    if (isInline(nextParams.initImageUrl)) delete nextParams.initImageUrl;
    if (isInline(nextParams.maskUrl)) delete nextParams.maskUrl;
  }
  const nextExtra =
    extra && isInline(extra.inpaintMaskDataUrl) ? { ...extra } : extra;
  if (nextExtra && nextExtra !== extra) delete nextExtra.inpaintMaskDataUrl;
  if (nextParams === params && nextExtra === extra) return row;
  return {
    ...row,
    params: nextParams,
    extraParams: nextExtra,
  };
}

export const upsertLocalSnapshot = (row: SnapshotInput) =>
  snapshotStore.upsert(stripInlineImages(row));

export async function deleteLocalSnapshot(id: string) {
  const local = await getLocalDb();
  if (local) {
    await revokeMediaUrlsForSnapshots(local, [id]);
    await local.db.delete(media).where(eq(media.imageSnapshotId, id));
  }
  await snapshotStore.drop(id);
}

// toImageView's blob: URLs pin the decoded bytes for the document's lifetime,
// so deleting rows without revoking keeps every deleted image in memory until
// a reload.
async function revokeMediaUrlsForSnapshots(
  local: LocalClient,
  snapshotIds: string[],
) {
  const rows = await local.db
    .select({ id: media.id })
    .from(media)
    .where(inArray(media.imageSnapshotId, snapshotIds));
  for (const row of rows) revokeMediaBlobUrl(row.id);
}

// Snapshots cascade with the session row, but `media.playground_id` has no FK,
// so the images (the bulk of the bytes) orphan and keep the space. Delete them
// BEFORE the cascade takes away the snapshot ids that identify them.
export async function deleteLocalImageSessionDeep(sessionId: string) {
  const local = await getLocalDb();
  if (!local) return;
  const snapshots = await local.db
    .select({ id: imageSnapshots.id })
    .from(imageSnapshots)
    .where(eq(imageSnapshots.sessionId, sessionId));
  const ids = snapshots.map((s) => s.id);
  if (ids.length > 0) {
    await revokeMediaUrlsForSnapshots(local, ids);
    await local.db.delete(media).where(inArray(media.imageSnapshotId, ids));
  }
  await sessionStore.drop(sessionId);
}

export async function bumpLocalSessionCounts(
  sessionId: string,
  delta: { snapshots?: number; images?: number },
) {
  const local = await getLocalDb();
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
  snapshotId: string,
  images: MediaInput[],
) {
  const local = await getLocalDb();
  if (!local) return;
  await replaceChildRows(
    local.db,
    media,
    media.imageSnapshotId,
    snapshotId,
    images,
    (row) => row,
  );
}

export async function readLocalImageBytes(
  mediaId: string,
): Promise<string | null> {
  const row = await mediaStore.get(mediaId);
  return row?.dataBase64 ?? null;
}

export async function readLocalSessionBundle(sessionId: string) {
  const local = await getLocalDb();
  if (!local) return null;
  const session = await readLocalImageSession(sessionId);
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

// ONE latest snapshot + ONE image per session: the full-bundle read loads every
// base64 image of every session, far too heavy for thumbnails.
export async function readLocalSessionPreviews() {
  const local = await getLocalDb();
  if (!local) return [];
  const sessions = (await readLocalImageSessions()) ?? [];
  const out: {
    session: (typeof sessions)[number];
    latestSnapshot: SnapshotView | null;
    latestImage: ImageView | null;
  }[] = [];
  for (const session of sessions) {
    const [latest] = await local.db
      .select()
      .from(imageSnapshots)
      .where(eq(imageSnapshots.sessionId, session.id))
      .orderBy(desc(imageSnapshots.sessionOrder))
      .limit(1);
    if (!latest) {
      out.push({ session, latestSnapshot: null, latestImage: null });
      continue;
    }
    const [firstImage] = await local.db
      .select()
      .from(media)
      .where(eq(media.imageSnapshotId, latest.id))
      .orderBy(asc(media.sequenceIndex))
      .limit(1);
    const view = toSnapshotView(latest, firstImage ? [firstImage] : []);
    out.push({
      session,
      latestSnapshot: view,
      latestImage: view.images[0] ?? null,
    });
  }
  return out;
}

// Direct id lookup because callers POLL this; a session scan would load every
// base64 image each tick.
export async function readLocalSnapshotView(
  snapshotId: string,
): Promise<SnapshotView | null> {
  const local = await getLocalDb();
  if (!local) return null;
  const snapshot = await snapshotStore.get(snapshotId);
  if (!snapshot) return null;
  const images = await local.db
    .select()
    .from(media)
    .where(eq(media.imageSnapshotId, snapshotId))
    .orderBy(asc(media.sequenceIndex));
  return toSnapshotView(snapshot, images);
}

export async function readLocalSnapshotBySubmittedKey(
  submittedKey: string,
): Promise<ImageSnapshot | null> {
  const local = await getLocalDb();
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(imageSnapshots)
    .where(eq(imageSnapshots.submittedKey, submittedKey))
    .limit(1);
  return rows[0] ?? null;
}

// Patch, not upsert: a partial upsert would blank every column it did not carry.
export async function patchLocalSnapshotCost(
  snapshotId: string,
  costQuota: number,
) {
  const local = await getLocalDb();
  if (!local) return;
  await local.db
    .update(imageSnapshots)
    .set({ costQuota, updatedAt: dayjs().toDate() })
    .where(eq(imageSnapshots.id, snapshotId));
}

const imageModelStore = makeTableStore(imageModels, imageModels.air);

export const readLocalImageModels = () => imageModelStore.list();

export async function rememberLocalImageModel(model: {
  air: string;
  name: string;
  architecture?: string | null;
  heroImage?: string | null;
  nsfwLevel?: number | null;
}) {
  await imageModelStore.upsert({
    air: model.air,
    name: model.name,
    architecture: model.architecture ?? null,
    heroImage: model.heroImage ?? null,
    nsfwLevel: model.nsfwLevel ?? null,
    lastUsedAt: dayjs().toDate(),
  });
}
