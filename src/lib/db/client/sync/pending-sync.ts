"use client";

import {
  localPendingSync,
  type PendingSyncOp,
} from "@/lib/db/schema/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { SyncKindName } from "@/lib/validation/sync";
import type { QueryClient } from "@tanstack/react-query";
import { and, eq, inArray } from "drizzle-orm";
import { getLocalDb } from "../client";
import { buildSyncPayload } from "./build-payload";

// `local_pending_sync` writers + drainer. Mirror PATCH/DELETE failures queue a
// row; drainer (hydrator + post-mutation) replays via /api/sync.

export const MAX_PENDING_ATTEMPTS = 5;

export type PendingSyncRow = {
  kind: SyncKindName;
  id: string;
  op: PendingSyncOp;
  attempts: number;
  lastError: string | null;
};

export type DrainResult = {
  succeeded: number;
  retried: number;
  dead: Array<{ kind: SyncKindName; id: string }>;
  total: number;
};

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
): Promise<DrainResult> {
  const result: DrainResult = {
    succeeded: 0,
    retried: 0,
    dead: [],
    total: 0,
  };
  const local = await getLocalDb(userId);
  if (!local) return result;

  const rows = await local.db.select().from(localPendingSync);
  result.total = rows.length;
  for (const row of rows) {
    if (row.attempts >= MAX_PENDING_ATTEMPTS) {
      result.dead.push({ kind: row.kind, id: row.id });
      continue;
    }
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
      result.succeeded++;
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
      if (nextAttempts >= MAX_PENDING_ATTEMPTS) {
        logger.warn("Pending sync exhausted retries", {
          context: "local-db.pending-sync",
          kind: row.kind,
          id: row.id,
          op: row.op,
          lastError: String(err),
        });
        result.dead.push({ kind: row.kind, id: row.id });
      } else {
        result.retried++;
      }
    }
  }
  return result;
}

// Reads every queued row so UI surfaces (SyncBadge) can render pending state.
export async function readPendingSync(
  userId: number,
): Promise<PendingSyncRow[]> {
  const local = await getLocalDb(userId);
  if (!local) return [];
  const rows = await local.db.select().from(localPendingSync);
  return rows.map((r) => ({
    kind: r.kind,
    id: r.id,
    op: r.op,
    attempts: r.attempts,
    lastError: r.lastError,
  }));
}

// Resets `attempts=0, lastError=null` so drainPending will attempt the row
// again. Used by manual retry buttons after MAX_PENDING_ATTEMPTS is hit.
export async function requeuePending(
  userId: number,
  targets?: Array<{ kind: SyncKindName; id: string }>,
): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;
  if (targets && targets.length === 0) return;
  if (!targets) {
    await local.db
      .update(localPendingSync)
      .set({ attempts: 0, lastError: null });
    return;
  }
  // Composite PK (kind, id) — no clean tuple IN, so update per-kind groups.
  const byKind = new Map<SyncKindName, string[]>();
  for (const t of targets) {
    const arr = byKind.get(t.kind) ?? [];
    arr.push(t.id);
    byKind.set(t.kind, arr);
  }
  for (const [kind, ids] of byKind) {
    await local.db
      .update(localPendingSync)
      .set({ attempts: 0, lastError: null })
      .where(
        and(
          eq(localPendingSync.kind, kind),
          inArray(localPendingSync.id, ids),
        ),
      );
  }
}

// Requeue + drain + invalidate. Shared by the React Query retry mutation and
// the procedural DLQ toast action; each wraps with its own toast.
export async function retryPendingTargets(
  userId: number,
  qc: QueryClient,
  targets?: Array<{ kind: SyncKindName; id: string }>,
): Promise<DrainResult> {
  await requeuePending(userId, targets);
  qc.invalidateQueries({ queryKey: queryKeys.pendingSync() });
  const result = await drainPending(userId);
  qc.invalidateQueries({ queryKey: queryKeys.pendingSync() });
  qc.invalidateQueries({ queryKey: queryKeys.syncState() });
  return result;
}
