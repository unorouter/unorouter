// Retention sweep: deletes expired playground sessions + their R2 objects from Turso.

import { deleteGenerationObject } from "@/lib/config/r2";
import { getDb } from "@/lib/db/server/client";
import { media, playgroundSessions, playgrounds } from "@/lib/db/schema";
import { errMessage } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { eq, inArray, lt } from "drizzle-orm";

const SWEEP_INTERVAL_MS = 60_000;
const RETENTION_BATCH_SIZE = 100;
const RETENTION_DELETE_CONCURRENCY = 4;

let started = false;

// Bounded worker pool over shared cursor.
async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        await fn(item);
      }
    },
  );
  await Promise.all(workers);
}

export function startGenerationSweeper(): void {
  if (started) return;
  started = true;
  logger.info("generation retention sweeper started", {
    context: "generation.sweeper",
    intervalMs: SWEEP_INTERVAL_MS,
  });
  schedule();
}

function schedule(): void {
  setTimeout(() => {
    void sweepExpired()
      .catch((err) => {
        logger.error("generation retention sweep failed", {
          context: "generation.sweeper",
          err: errMessage(err),
        });
      })
      .finally(() => schedule());
  }, SWEEP_INTERVAL_MS);
}

// Drop expired session: R2 first, then row (cascade).
async function purgeSession(sessionId: string): Promise<void> {
  const db = getDb();
  const snaps = await db
    .select({ id: playgrounds.id })
    .from(playgrounds)
    .where(eq(playgrounds.sessionId, sessionId));
  if (snaps.length > 0) {
    const imgs = await db
      .select({ r2Key: media.r2Key })
      .from(media)
      .where(
        inArray(
          media.playgroundId,
          snaps.map((s) => s.id),
        ),
      );
    for (const img of imgs) {
      if (!img.r2Key) continue;
      try {
        await deleteGenerationObject(img.r2Key);
      } catch (err) {
        logger.warn("r2 delete failed (sweeper)", {
          context: "generation.sweeper",
          sessionId,
          r2Key: img.r2Key,
          err: errMessage(err),
        });
      }
    }
  }
  await db
    .delete(playgroundSessions)
    .where(eq(playgroundSessions.id, sessionId));
}

async function sweepExpired(): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ id: playgroundSessions.id })
    .from(playgroundSessions)
    .where(lt(playgroundSessions.expiresAt, new Date()))
    .limit(RETENTION_BATCH_SIZE);
  if (rows.length === 0) return;

  logger.info("retention sweep starting", {
    context: "generation.sweeper",
    count: rows.length,
  });
  await runPool(
    rows.map((r) => r.id),
    RETENTION_DELETE_CONCURRENCY,
    async (id) => {
      try {
        await purgeSession(id);
      } catch (err) {
        logger.warn("retention delete failed", {
          context: "generation.sweeper",
          sessionId: id,
          err: errMessage(err),
        });
      }
    },
  );
}
