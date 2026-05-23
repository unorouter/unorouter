"use client";

import {
  localPendingSync,
  type PendingSyncOp,
} from "@/lib/db/schema/client";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { SyncKindName } from "@/lib/validation/sync";
import { and, eq } from "drizzle-orm";
import { getLocalDb } from "../client";
import { buildSyncPayload } from "./build-payload";

// `local_pending_sync` writers + drainer. Mirror PATCH/DELETE failures queue a
// row; drainer (hydrator + post-mutation) replays via /api/sync.

const MAX_ATTEMPTS = 5;

export async function enqueuePending(
  userId: number,
  kind: SyncKindName,
  id: string,
  op: PendingSyncOp,
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
          await rpc.api.ai.sync({ kind: row.kind })({ id: row.id }).delete(),
        );
      } else {
        // Caller may snapshot a payload; otherwise rebuild from current local.
        const payload =
          (payloadFor && payloadFor(row.kind, row.id)) ??
          (await buildSyncPayload(userId, row.kind, row.id));
        handleElysia(
          await rpc.api.ai
            .sync({ kind: row.kind })({ id: row.id })
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
