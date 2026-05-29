"use client";

import {
  localPendingSync,
  type PendingSyncOp,
} from "@/lib/db/schema/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { SyncKindName, SyncMergeMode } from "@/lib/validation/sync";
import type { QueryClient } from "@tanstack/react-query";
import { broadcastInvalidate } from "@/lib/react-query/cross-tab-invalidate";
import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { getLocalDb } from "../client";

// `local_pending_sync` writer + drainer for failed mirror PATCH/DELETE.

export const MAX_PENDING_ATTEMPTS = 5;

// Exponential backoff schedule in ms keyed by current attempts count.
// Index 0 means "no prior failure" (drain immediately).
const BACKOFF_SCHEDULE_MS = [0, 30_000, 120_000, 480_000, 1_800_000];

function nextAttemptDelay(attempts: number): number {
  return (
    BACKOFF_SCHEDULE_MS[Math.min(attempts, BACKOFF_SCHEDULE_MS.length - 1)] ?? 0
  );
}

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

export type EnqueueOpts = {
  /** Snapshot of original mirror payload; preserves delta scope+mergeMode across retries. */
  payload?: unknown;
  mergeMode?: SyncMergeMode;
};

export async function enqueuePending(
  userId: number,
  kind: SyncKindName,
  id: string,
  op: PendingSyncOp,
  err?: unknown,
  opts?: EnqueueOpts,
) {
  const local = await getLocalDb(userId);
  if (!local) return;

  // Guard delete->patch: queued delete already implies row is gone.
  const existing = await local.db
    .select({ op: localPendingSync.op })
    .from(localPendingSync)
    .where(
      and(eq(localPendingSync.kind, kind), eq(localPendingSync.id, id)),
    )
    .limit(1);
  if (existing[0]?.op === "delete" && op === "patch") return;

  const payloadJson =
    op === "delete" || opts?.payload === undefined
      ? null
      : JSON.stringify(opts.payload);
  const mergeMode = op === "delete" ? null : (opts?.mergeMode ?? null);

  await local.db
    .insert(localPendingSync)
    .values({
      kind,
      id,
      op,
      attempts: 0,
      lastError: err ? String(err) : null,
      payloadJson,
      mergeMode,
    })
    .onConflictDoUpdate({
      target: [localPendingSync.kind, localPendingSync.id],
      // Fresh enqueue resets backoff; latest payload wins.
      set: {
        op,
        attempts: 0,
        nextAttemptAt: null,
        lastError: err ? String(err) : null,
        payloadJson,
        mergeMode,
      },
    });
}

export async function drainPending(
  userId: number,
): Promise<DrainResult> {
  const result: DrainResult = {
    succeeded: 0,
    retried: 0,
    dead: [],
    total: 0,
  };
  const local = await getLocalDb(userId);
  if (!local) return result;

  const now = new Date();
  // FIFO + backoff: skip rows scheduled for a future attempt.
  const rows = await local.db
    .select()
    .from(localPendingSync)
    .where(
      or(
        isNull(localPendingSync.nextAttemptAt),
        lte(localPendingSync.nextAttemptAt, now),
      ),
    )
    .orderBy(asc(localPendingSync.queuedAt));
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
        // Immutable snapshot from enqueue time; never rebuilt from local state.
        const payload =
          row.payloadJson != null ? JSON.parse(row.payloadJson) : undefined;
        if (payload === undefined) {
          throw new Error(
            `pending row missing payload (kind=${row.kind}, id=${row.id})`,
          );
        }
        handleElysia(
          await rpc.api.ai
            .sync({ kind: row.kind })({ id: row.id })
            .post({
              days: undefined,
              payload,
              mergeMode: row.mergeMode ?? undefined,
            }),
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
      const nextAttemptAt = new Date(
        Date.now() + nextAttemptDelay(nextAttempts),
      );
      await local.db
        .update(localPendingSync)
        .set({
          attempts: nextAttempts,
          nextAttemptAt,
          lastError: String(err),
        })
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
  // Sister tabs refresh sync-state + badges on drain success.
  if (result.succeeded > 0 || result.dead.length > 0) {
    broadcastInvalidate([
      queryKeys.pendingSync(),
      queryKeys.syncState(),
    ]);
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
async function requeuePending(
  userId: number,
  targets?: Array<{ kind: SyncKindName; id: string }>,
): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;
  if (targets && targets.length === 0) return;
  if (!targets) {
    await local.db
      .update(localPendingSync)
      .set({ attempts: 0, nextAttemptAt: null, lastError: null });
    return;
  }
  // Composite PK (kind, id). No clean tuple IN, so update per-kind groups.
  const byKind = new Map<SyncKindName, string[]>();
  for (const t of targets) {
    const arr = byKind.get(t.kind) ?? [];
    arr.push(t.id);
    byKind.set(t.kind, arr);
  }
  for (const [kind, ids] of byKind) {
    await local.db
      .update(localPendingSync)
      .set({ attempts: 0, nextAttemptAt: null, lastError: null })
      .where(
        and(
          eq(localPendingSync.kind, kind),
          inArray(localPendingSync.id, ids),
        ),
      );
  }
}

// Requeue + drain + invalidate. Shared by retry mutation and DLQ toast.
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
