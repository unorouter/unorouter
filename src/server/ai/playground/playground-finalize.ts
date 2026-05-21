import { getDb } from "@/lib/db/server/client";
import {
  playgroundImages,
  playgroundSessions,
  playgrounds,
} from "@/lib/db/schema";
import type { PlaygroundSubmitBody } from "@/lib/validation/playground";
import { dayjs } from "@/lib/utils/format/date";
import { eq, sql } from "drizzle-orm";

// Must stay aligned with form variants buttons (1/2/4) and validator bounds.
const MAX_IMAGES_PER_GEN = 4;

// All terminal writes clear submittedKey, bump updatedAt, set terminal status.
// Success path inserts images + bumps the session imageCount in one tx.

export type R2Uploaded = {
  url: string;
  key: string;
  mime: string;
  sizeBytes: number;
};

export type ImagePayload = {
  resultUri: string;
  uploaded: R2Uploaded;
};

export function paramsToSize(
  params: PlaygroundSubmitBody["params"],
): string | undefined {
  const p = params ?? {};
  return p.width && p.height ? `${p.width}x${p.height}` : undefined;
}

export function imageCountFor(body: PlaygroundSubmitBody): number {
  const n = body.params?.n ?? 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_IMAGES_PER_GEN, Math.floor(n));
}

export async function finalizeRowSuccess(
  db: ReturnType<typeof getDb>,
  id: string,
  sessionId: string,
  images: ImagePayload[],
  progress: string = "100%",
) {
  if (images.length === 0) {
    throw new Error("finalizeRowSuccess called with no images");
  }
  await db.transaction(async (tx) => {
    // Clear partial inserts from a retry; PK (playgroundId, sequenceIndex).
    await tx
      .delete(playgroundImages)
      .where(eq(playgroundImages.playgroundId, id));
    await tx.insert(playgroundImages).values(
      images.map((img, idx) => ({
        playgroundId: id,
        sequenceIndex: idx,
        upstreamResultUrl: img.resultUri.startsWith("data:")
          ? null
          : img.resultUri,
        r2Url: img.uploaded.url,
        r2Key: img.uploaded.key,
        mimeType: img.uploaded.mime,
        sizeBytes: img.uploaded.sizeBytes,
      })),
    );
    await tx
      .update(playgrounds)
      .set({
        status: "success",
        progress,
        submittedKey: null,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(playgrounds.id, id));
    await tx
      .update(playgroundSessions)
      .set({
        imageCount: sql`${playgroundSessions.imageCount} + ${images.length}`,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(playgroundSessions.id, sessionId));
  });
}

export async function finalizeRowFailure(
  db: ReturnType<typeof getDb>,
  id: string,
  errorMessage: string,
  opts?: { progress?: string },
) {
  await db
    .update(playgrounds)
    .set({
      status: "failure",
      errorMessage: errorMessage.slice(0, 500),
      submittedKey: null,
      ...(opts?.progress !== undefined && { progress: opts.progress }),
      updatedAt: dayjs().toDate(),
    })
    .where(eq(playgrounds.id, id));
}
