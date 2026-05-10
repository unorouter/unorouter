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
//     at submit time). pollGenerationStatus enforces userId ownership.
//
// Singleton: started once per process via instrumentation.register().
// Multi-instance deploys would dedupe via the staleness window: workers
// poll the same row only if their wall-clock drift is large enough that
// both see it as stale, which is fine since pollGenerationStatus is
// idempotent.

import { getDb } from "@/lib/db/client";
import { generations } from "@/lib/db/schema";
import { logger } from "@/lib/utils/logger";
import { and, isNotNull, lt, ne } from "drizzle-orm";
import { pollGenerationStatus } from "./generation.service";

const SWEEP_INTERVAL_MS = 5_000;
const STALE_AFTER_MS = 4_000;
const POLL_CONCURRENCY = 4;
const ROWS_PER_SWEEP = 50;

let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;

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
  timer = setTimeout(() => {
    void sweepOnce()
      .catch((err) => {
        logger.error("generation sweep failed", {
          context: "generation.sweeper",
          err: err instanceof Error ? err.message : String(err),
        });
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
        await pollGenerationStatus(row.userId, row.submittedKey, row.id);
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
