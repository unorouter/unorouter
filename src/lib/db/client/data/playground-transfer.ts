"use client";

import { RETENTION_MS } from "@/lib/config/constants";
import type { Playground } from "@/lib/db/schema/shared";
import type {
  PlaygroundSnapshot,
  SessionSnapshot,
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

// Export a session into a portable, self-contained JSON payload. Each image's
// bytes are inlined as base64 (fetched from R2 if not cached locally) so the
// file survives R2 expiry and works for guests.
export async function exportLocalSession(
  userId: number | undefined,
  sessionId: string,
): Promise<SessionSnapshot> {
  const bundle = await readLocalGenerationSessionBundle(userId, sessionId);
  if (!bundle) throw new Error("playground-session-not-found");
  const snapshots: PlaygroundSnapshot[] = [];
  for (const snap of bundle.playgrounds as Playground[]) {
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
      version: "unorouter-generation-1",
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
    version: "unorouter-session-1",
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
    params: (snap.params as Record<string, unknown> | null) ?? null,
    loras: snap.loras ?? null,
    references: snap.references ?? null,
    extraParams: (snap.extraParams as Record<string, unknown> | null) ?? null,
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

// "restore" import: writes a brand-new local session reproducing every
// snapshot in success state. Single-snapshot payloads are the N=1 case.
export async function importLocalSession(
  userId: number | undefined,
  payload: PlaygroundSnapshot | SessionSnapshot,
): Promise<{ sessionId: string }> {
  const uidVal = userId ?? 0;
  const now = dayjs().toDate();
  const expiresAt = new Date(Date.now() + RETENTION_MS);
  const sessionId = uid();

  const snapshots: PlaygroundSnapshot[] =
    payload.version === "unorouter-session-1"
      ? payload.snapshots
      : [payload];
  const title =
    payload.version === "unorouter-session-1"
      ? (payload.session.title?.slice(0, 60).trim() || null)
      : (payload.prompt.slice(0, 60).trim() || null);
  const firstModel =
    payload.version === "unorouter-session-1"
      ? payload.session.firstModel
      : payload.model;

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
