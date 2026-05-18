// Server-side sweep loop for generation status. Catches the case where the
// client tab closes (or never mounts the row's polling hook) before the
// upstream task terminates.
//
// Design:
//   - Every SWEEP_INTERVAL_MS, find rows with non-terminal status whose
//     updatedAt is older than STALE_AFTER_MS. The staleness gate prevents
//     racing with the live client poll: if the client just polled (and
//     bumped updatedAt), we skip this row.
//   - Bounded concurrency. POLL_CONCURRENCY parallel polls per sweep so
//     one stuck upstream call doesn't block the rest.
//   - Each poll uses the row's `submittedKey` (the user's API key captured
//     at submit time). pollSnapshotStatus enforces userId ownership.
//
// Singleton: started once per process via instrumentation.register().
// Multi-instance deploys would dedupe via the staleness window: workers
// poll the same row only if their wall-clock drift is large enough that
// both see it as stale, which is fine since pollSnapshotStatus is
// idempotent.

import { getDb } from "@/lib/db/server/client";
import { generations } from "@/lib/db/schema";
import { logger } from "@/lib/utils/logger";
import { and, isNotNull, lt, ne } from "drizzle-orm";
import {
  deleteSessionAsSystem,
  listExpiredSessionIds,
  pollSnapshotStatus,
} from "./generation.service";

const SWEEP_INTERVAL_MS = 5_000;
const STALE_AFTER_MS = 4_000;
const POLL_CONCURRENCY = 4;
const ROWS_PER_SWEEP = 50;

// Probability the sweep tick also runs a retention pass. 0.1 amortizes
// the scan to roughly once per 50 seconds at the 5s interval, which is
// plenty for a 30-day window. Keep low to avoid hammering R2 deletes.
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
    // Amortized retention pass: ~1 in 10 ticks runs the expiry scan.
    // The retention task is independent of the poll sweep so a slow R2
    // delete doesn't block live polling.
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

  // Rows worth polling: have a submittedKey (i.e. still authorisable), are
  // not yet terminal, and haven't been touched recently. The
  // not-success / not-failure pair is faster than a NOT IN list on SQLite
  // for our small status alphabet.
  const candidates = await db
    .select({
      id: generations.id,
      userId: generations.userId,
      submittedKey: generations.submittedKey,
    })
    .from(generations)
    .where(
      and(
        isNotNull(generations.submittedKey),
        ne(generations.status, "success"),
        ne(generations.status, "failure"),
        lt(generations.updatedAt, cutoff),
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
          generationId: row.id,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });
  await Promise.all(workers);
}

// Retention sweep: find sessions past expiresAt and cascade-delete them.
// generations + generation_images cascade via FK. R2 objects are deleted
// per image inside deleteSessionAsSystem. Concurrency is bounded so we
// don't hammer R2 if a large backlog accumulates.
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
