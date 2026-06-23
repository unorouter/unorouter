"use client";

import { PLAYGROUND_SESSION_TITLE_MAX } from "@/components/pages/sidebar/playground/playground-constants";
import { GUEST_USER_ID, RETENTION_MS } from "@/lib/config/constants";
import {
  isPlaygroundSessionFormat,
  PLAYGROUND_GENERATION_FORMAT,
  PLAYGROUND_SESSION_FORMAT,
  type PlaygroundSnapshot,
  type SessionSnapshot,
} from "@/lib/validation/playground";
import { uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import {
  bumpLocalSessionCounts,
  readLocalGenerationImage,
  readLocalGenerationSessionBundle,
  upsertLocalGenerationSession,
  upsertLocalSnapshot,
  upsertLocalSnapshotImages,
} from "./playground";

// Self-contained export: image bytes inlined as base64 so the file survives R2 expiry and works for guests.
export async function exportLocalSession(
  userId: number | undefined,
  sessionId: string,
): Promise<SessionSnapshot> {
  const bundle = await readLocalGenerationSessionBundle(userId, sessionId);
  if (!bundle) throw new Error("playground-session-not-found");
  const snapshots: PlaygroundSnapshot[] = [];
  for (const snap of bundle.playgrounds) {
    const imgs = bundle.media.filter((m) => m.playgroundId === snap.id);
    const images = await Promise.all(
      imgs.map(async (img) => ({
        sequenceIndex: img.sequenceIndex ?? 0,
        base64: (await readLocalGenerationImage(userId, img.id)) ?? "",
        mimeType: img.mimeType,
        width: img.width,
        height: img.height,
      })),
    );
    snapshots.push({
      version: PLAYGROUND_GENERATION_FORMAT,
      model: snap.model,
      prompt: snap.prompt,
      negativePrompt: snap.negativePrompt,
      params: snap.params,
      loras: snap.loras,
      references: snap.references,
      extraParams: snap.extraParams,
      images: images.filter((i) => i.base64),
    });
  }
  return {
    version: PLAYGROUND_SESSION_FORMAT,
    session: {
      title: bundle.session.title,
      firstModel: bundle.session.firstModel,
    },
    snapshots,
  };
}

function snapshotToRows(
  userId: number,
  sessionId: string,
  snap: PlaygroundSnapshot,
  order: number,
) {
  const now = dayjs().toDate();
  const expiresAt = new Date(Date.now() + RETENTION_MS);
  const snapshotId = uid();
  const snapshotRow = {
    id: snapshotId,
    userId,
    sessionId,
    sessionOrder: order,
    requestedCount: Math.max(1, snap.images.length),
    model: snap.model,
    prompt: snap.prompt,
    negativePrompt: snap.negativePrompt,
    params: snap.params ?? null,
    loras: snap.loras ?? null,
    references: snap.references ?? null,
    extraParams: snap.extraParams ?? null,
    status: "success",
    progress: "100%",
    taskId: null,
    visibility: "private",
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
  const mediaRows = snap.images.map((img) => ({
    id: uid(),
    userId,
    convId: null,
    playgroundId: snapshotId,
    sequenceIndex: img.sequenceIndex,
    upstreamResultUrl: null,
    r2Key: null,
    r2Url: null,
    dataBase64: img.base64,
    mimeType: img.mimeType ?? "image/png",
    sizeBytes: 0,
    width: img.width,
    height: img.height,
    extractedText: null,
    createdAt: now,
  }));
  return { snapshotRow, mediaRows };
}

// "restore" import: writes a brand-new local session reproducing every snapshot in success state. Single-snapshot payloads are the N=1 case.
export async function importLocalSession(
  userId: number | undefined,
  payload: PlaygroundSnapshot | SessionSnapshot,
): Promise<{ sessionId: string }> {
  const uidVal = userId ?? GUEST_USER_ID;
  const now = dayjs().toDate();
  const expiresAt = new Date(Date.now() + RETENTION_MS);
  const sessionId = uid();

  const isSession = isPlaygroundSessionFormat(payload);
  const snapshots: PlaygroundSnapshot[] = isSession
    ? payload.snapshots
    : [payload];
  const title = isSession
    ? payload.session.title?.slice(0, PLAYGROUND_SESSION_TITLE_MAX).trim() ||
      null
    : payload.prompt.slice(0, PLAYGROUND_SESSION_TITLE_MAX).trim() || null;
  const firstModel = isSession ? payload.session.firstModel : payload.model;

  await upsertLocalGenerationSession(uidVal, {
    id: sessionId,
    userId: uidVal,
    title,
    firstModel,
    snapshotCount: 0,
    imageCount: 0,
    expiresAt,
    syncExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  });

  let imageTotal = 0;
  for (let i = 0; i < snapshots.length; i++) {
    const { snapshotRow, mediaRows } = snapshotToRows(
      uidVal,
      sessionId,
      snapshots[i],
      i,
    );
    await upsertLocalSnapshot(uidVal, snapshotRow);
    await upsertLocalSnapshotImages(uidVal, snapshotRow.id, mediaRows);
    imageTotal += mediaRows.length;
  }
  await bumpLocalSessionCounts(uidVal, sessionId, {
    snapshots: snapshots.length,
    images: imageTotal,
  });
  return { sessionId };
}
