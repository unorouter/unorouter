// Catches the case where the client tab closes before the upstream task
// terminates. Staleness gate avoids racing live client polls. Singleton via
// instrumentation.register(); pollSnapshotStatus is idempotent.

import { getDb } from "@/lib/db/server/client";
import { playgrounds } from "@/lib/db/schema";
import { logger } from "@/lib/utils/logger";
import { and, isNotNull, lt, ne } from "drizzle-orm";
import {
  deleteSessionAsSystem,
  listExpiredSessionIds,
  pollSnapshotStatus,
} from "./playground.service";

const SWEEP_INTERVAL_MS = 5_000;
const STALE_AFTER_MS = 4_000;
const POLL_CONCURRENCY = 4;
const ROWS_PER_SWEEP = 50;

// 0.1 amortizes to ~once per 50s at the 5s interval; plenty for a 30-day TTL.
const RETENTION_SWEEP_CHANCE = 0.1;
const RETENTION_DELETE_CONCURRENCY = 4;
const RETENTION_BATCH_SIZE = 100;

let started = false;

export function startGenerationSweeper(): void {
  if (started) return;
  started = true;
  logger.info("generation sweeper started", {
    context: "generation.sweeper",
    intervalMs: SWEEP_INTERVAL_MS,
    staleAfterMs: STALE_AFTER_MS,
  });
  schedule();
}

function schedule(): void {
  setTimeout(() => {
    const tasks: Array<Promise<void>> = [sweepOnce()];
    if (Math.random() < RETENTION_SWEEP_CHANCE) {
      tasks.push(sweepExpired());
    }
    void Promise.allSettled(tasks)
      .then((results) => {
        for (const r of results) {
          if (r.status === "rejected") {
            logger.error("generation sweep failed", {
              context: "generation.sweeper",
              err:
                r.reason instanceof Error ? r.reason.message : String(r.reason),
            });
          }
        }
      })
      .finally(() => schedule());
  }, SWEEP_INTERVAL_MS);
}

async function sweepOnce(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);

  // ne(success) + ne(failure) is faster than NOT IN on SQLite.
  const candidates = await db
    .select({
      id: playgrounds.id,
      userId: playgrounds.userId,
      submittedKey: playgrounds.submittedKey,
    })
    .from(playgrounds)
    .where(
      and(
        isNotNull(playgrounds.submittedKey),
        ne(playgrounds.status, "success"),
        ne(playgrounds.status, "failure"),
        lt(playgrounds.updatedAt, cutoff),
      ),
    )
    .limit(ROWS_PER_SWEEP);

  if (candidates.length === 0) return;

  let cursor = 0;
  const workers = Array.from({ length: POLL_CONCURRENCY }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= candidates.length) return;
      const row = candidates[i];
      if (!row.submittedKey) continue;
      try {
        await pollSnapshotStatus(row.userId, row.submittedKey, row.id);
      } catch (err) {
        logger.warn("sweep poll failed", {
          context: "generation.sweeper",
          playgroundId: row.id,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });
  await Promise.all(workers);
}

async function sweepExpired(): Promise<void> {
  const ids = await listExpiredSessionIds(RETENTION_BATCH_SIZE);
  if (ids.length === 0) return;

  logger.info("retention sweep starting", {
    context: "generation.sweeper.retention",
    count: ids.length,
  });

  let cursor = 0;
  const workers = Array.from(
    { length: RETENTION_DELETE_CONCURRENCY },
    async () => {
      while (true) {
        const i = cursor++;
        if (i >= ids.length) return;
        const id = ids[i];
        try {
          await deleteSessionAsSystem(id);
        } catch (err) {
          logger.warn("retention delete failed", {
            context: "generation.sweeper.retention",
            sessionId: id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }
    },
  );
  await Promise.all(workers);
}
