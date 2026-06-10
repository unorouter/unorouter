"use client";

import { media, playgrounds } from "@/lib/db/schema/shared";
import { arrayBufferToBase64 } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { eq, inArray } from "drizzle-orm";
import { getLocalDb } from "../client";
import { readLocalMedia, upsertLocalMedia } from "../data/media";

type MediaRow = typeof media.$inferSelect;

const REHYDRATE_CONCURRENCY = 6;

export async function rehydrateMediaBatch(
  userId: number,
  rows: MediaRow[],
): Promise<MediaRow[]> {
  const out = new Array<MediaRow>(rows.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: REHYDRATE_CONCURRENCY }, async () => {
      while (cursor < rows.length) {
        const i = cursor++;
        out[i] = await rehydrateMedia(userId, rows[i]);
      }
    }),
  );
  return out;
}

// Asymmetric base64 rule (see media schema): pulls carry dataBase64=null; fetch
// R2 only on first sight, never overwrite a present local cache.
async function rehydrateMedia(
  userId: number,
  row: MediaRow,
): Promise<MediaRow> {
  if (row.dataBase64) return row;
  const existing = await readLocalMedia(userId, row.id);
  const fallbackBase64 = existing?.dataBase64 ?? null;
  if (!row.r2Url) {
    return fallbackBase64 ? { ...row, dataBase64: fallbackBase64 } : row;
  }
  if (fallbackBase64) {
    return { ...row, dataBase64: fallbackBase64 };
  }
  try {
    const res = await fetch(row.r2Url);
    if (!res.ok) {
      logger.warn("R2 media fetch failed", {
        context: "local-db.hydrator",
        id: row.id,
        status: res.status,
      });
      return row;
    }
    const buf = await res.arrayBuffer();
    return { ...row, dataBase64: arrayBufferToBase64(buf) };
  } catch (err) {
    logger.warn("R2 media rehydrate failed", {
      context: "local-db.hydrator",
      id: row.id,
      error: String(err),
    });
    return row;
  }
}

// Pull base64 back from R2 for every media row of a conv/session that still
// lacks it. Run BEFORE unsync: the server purges the R2 prefix when the row
// is removed, and push devices evicted their local base64 after upload.
export async function rehydrateParentMedia(
  userId: number,
  parent: { convId: string } | { playgroundSessionId: string },
): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;
  let rows: MediaRow[];
  if ("convId" in parent) {
    rows = await local.db
      .select()
      .from(media)
      .where(eq(media.convId, parent.convId));
  } else {
    rows = await local.db
      .select()
      .from(media)
      .where(
        inArray(
          media.playgroundId,
          local.db
            .select({ id: playgrounds.id })
            .from(playgrounds)
            .where(eq(playgrounds.sessionId, parent.playgroundSessionId)),
        ),
      );
  }
  const needy = rows.filter((r) => !r.dataBase64 && r.r2Url);
  const hydrated = await rehydrateMediaBatch(userId, needy);
  for (const row of hydrated) {
    if (row.dataBase64) await upsertLocalMedia(userId, row);
  }
}
