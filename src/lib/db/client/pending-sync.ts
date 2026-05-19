"use client";

import { localPendingSync } from "@/lib/db/schema/client";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { SyncKindName } from "@/lib/validation/sync";
import { and, eq } from "drizzle-orm";
import { getLocalDb } from "./client";

// ---------------------------------------------------------------------------
// `local_pending_sync` table writers + drainer. Mirror PATCH/DELETE failures
// queue a row here; the drainer (called by the hydrator and after every
// successful mutation) replays them via /api/sync.
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;

export type PendingOp = "patch" | "delete";

export async function enqueuePending(
  userId: number,
  kind: SyncKindName,
  id: string,
  op: PendingOp,
  err?: unknown,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(localPendingSync)
    .values({
      kind,
      id,
      op,
      attempts: 0,
      lastError: err ? String(err) : null,
    })
    .onConflictDoUpdate({
      target: [localPendingSync.kind, localPendingSync.id],
      set: { op, lastError: err ? String(err) : null },
    });
}

export async function drainPending(
  userId: number,
  payloadFor?: (kind: SyncKindName, id: string) => unknown | undefined,
): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;

  const rows = await local.db.select().from(localPendingSync);
  for (const row of rows) {
    if (row.attempts >= MAX_ATTEMPTS) continue;
    try {
      if (row.op === "delete") {
        handleElysia(
          await rpc.api.ai
            .sync({ kind: row.kind as SyncKindName })({ id: row.id })
            .delete(),
        );
      } else {
        const payload = payloadFor
          ? payloadFor(row.kind as SyncKindName, row.id)
          : undefined;
        handleElysia(
          await rpc.api.ai
            .sync({ kind: row.kind as SyncKindName })({ id: row.id })
            .post({ days: undefined, payload }),
        );
      }
      await local.db
        .delete(localPendingSync)
        .where(
          and(
            eq(localPendingSync.kind, row.kind),
            eq(localPendingSync.id, row.id),
          ),
        );
    } catch (err) {
      const nextAttempts = row.attempts + 1;
      await local.db
        .update(localPendingSync)
        .set({ attempts: nextAttempts, lastError: String(err) })
        .where(
          and(
            eq(localPendingSync.kind, row.kind),
            eq(localPendingSync.id, row.id),
          ),
        );
      if (nextAttempts >= MAX_ATTEMPTS) {
        logger.warn("Pending sync exhausted retries", {
          context: "local-db.pending-sync",
          kind: row.kind,
          id: row.id,
          op: row.op,
          lastError: String(err),
        });
      }
    }
  }
}
