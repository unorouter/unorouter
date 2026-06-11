"use client";

import {
  localPendingTasks,
  type PendingSyncOp,
  type PendingTaskType,
} from "@/lib/db/schema/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { SyncKindName } from "@/lib/validation/sync-constants";
import type { QueryClient } from "@tanstack/react-query";
import { broadcastInvalidate } from "@/lib/react-query/cross-tab-invalidate";
import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { getLocalDb } from "../client";
import { buildPendingPushes, type ConvSyncHint } from "./build-payload";
import { adoptRefSyncExpiry, evictMediaBase64After } from "./evict-media";
import { acquireLock, releaseLock } from "./resource-lock";
import { enrichRequestLogFromUpstream } from "./log-enrich";

// Outbox writer + drainer for deferred background work. "sync" pushes to the
// sync API (payload rebuilt from local state); "logEnrich" pulls a request's
// authoritative cost/tokens/channel from new-api after the stream settled. Both
// retry with backoff on the same row.

export const MAX_PENDING_ATTEMPTS = 5;

// Backoff ms by attempts count; index 0 = no prior failure, drain immediately.
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
  /** Conversation scope; defaults to "full". Ignored for other kinds. */
  hint?: ConvSyncHint;
  /** Message ids for the "msgs" scope; unioned across enqueues. */
  msgIds?: string[];
  /** Task-specific args (e.g. logEnrich {requestId}); stored as JSON. */
  payload?: Record<string, unknown>;
};

type OutboxRow = typeof localPendingTasks.$inferSelect;

// Serialize enqueues: read-merge-write below means two interleaved calls for
// the same row would both read the same base and the second write would drop
// the first's hints/msgIds. A module promise chain removes the interleave.
let enqueueChain: Promise<unknown> = Promise.resolve();

export function enqueueSync(
  userId: number,
  kind: SyncKindName,
  id: string,
  op: PendingSyncOp = "patch",
  opts?: EnqueueOpts,
): Promise<void> {
  return enqueueTask(userId, "sync", kind, id, op, opts);
}

// General enqueue for any task type. sync uses kind=SyncKindName; logEnrich uses
// kind="" and rides `payload`.
export function enqueueTask(
  userId: number,
  taskType: PendingTaskType,
  kind: SyncKindName | "",
  id: string,
  op: PendingSyncOp = "patch",
  opts?: EnqueueOpts,
): Promise<void> {
  const run = enqueueChain.then(() =>
    doEnqueue(userId, taskType, kind, id, op, opts),
  );
  enqueueChain = run.catch(() => {});
  return run;
}

async function doEnqueue(
  userId: number,
  taskType: PendingTaskType,
  kind: SyncKindName | "",
  id: string,
  op: PendingSyncOp,
  opts?: EnqueueOpts,
) {
  const local = await getLocalDb(userId);
  if (!local) return;

  // Read-merge-write (no local.transaction(): SQLocal mutex deadlocks drizzle
  // proxy queries): hints/msgIds union with what's already queued so coalesced
  // rows keep their full scope. The seq guard in drain covers the race window.
  const existing = (
    await local.db
      .select()
      .from(localPendingTasks)
      .where(
        and(
          eq(localPendingTasks.taskType, taskType),
          eq(localPendingTasks.kind, kind),
          eq(localPendingTasks.id, id),
        ),
      )
      .limit(1)
  )[0];
  // Guard delete->patch: queued delete already implies row is gone.
  if (existing?.op === "delete" && op === "patch") return;

  let hint: string | null = null;
  let msgIds: string | null = null;
  if (taskType === "sync" && op === "patch" && kind === "conversations") {
    const hints = new Set<string>(
      existing?.op === "patch" && existing.hint ? existing.hint.split(",") : [],
    );
    hints.add(opts?.hint ?? "full");
    // "full" absorbs every partial scope.
    hint = hints.has("full") ? "full" : [...hints].join(",");
    if (hint !== "full") {
      const ids = new Set<string>(
        existing?.msgIds ? (JSON.parse(existing.msgIds) as string[]) : [],
      );
      for (const m of opts?.msgIds ?? []) ids.add(m);
      msgIds = ids.size > 0 ? JSON.stringify([...ids]) : null;
    }
  }

  const set = {
    op,
    // Fresh enqueue resets backoff.
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    hint,
    msgIds,
    payload: opts?.payload ? JSON.stringify(opts.payload) : null,
    seq: (existing?.seq ?? 0) + 1,
  };
  await local.db
    .insert(localPendingTasks)
    .values({ taskType, kind, id, ...set })
    .onConflictDoUpdate({
      target: [
        localPendingTasks.taskType,
        localPendingTasks.kind,
        localPendingTasks.id,
      ],
      set,
    });
}

// Per-task-type drain handler. Throws to retry (rides the backoff); resolves to
// signal success (row deleted).
type TaskHandler = (userId: number, row: OutboxRow) => Promise<void>;

const TASK_HANDLERS: Record<PendingTaskType, TaskHandler> = {
  sync: pushRow,
  logEnrich: drainLogEnrich,
};

// One sync outbox row -> wire. Rebuilds payload(s) from the local DB; a missing
// local row means it was deleted before drain (nothing to push).
async function pushRow(userId: number, row: OutboxRow): Promise<void> {
  const kind = row.kind as SyncKindName;
  if (row.op === "delete") {
    const res = await rpc.api.ai.sync({ kind })({ id: row.id }).delete();
    // Row already gone server-side (other-device delete, TTL sweep): the
    // delete's goal is met; retrying 404s only dead-letters a no-op.
    if ((res.error as { status?: number } | null)?.status === 404) return;
    handleElysia(res);
    return;
  }
  const hints = new Set<ConvSyncHint>(
    (row.hint ? row.hint.split(",") : []) as ConvSyncHint[],
  );
  const msgIds = row.msgIds ? (JSON.parse(row.msgIds) as string[]) : [];
  const pushes = await buildPendingPushes(userId, kind, row.id, hints, msgIds);
  for (const push of pushes ?? []) {
    const pushed = handleElysia(
      await rpc.api.ai.sync({ kind })({ id: row.id }).post({
        payload: push.payload,
        keepExpiry: true,
        mergeMode: push.mergeMode,
      }),
    );
    // Full bundle pushes return media with fresh R2 keys; evict the
    // now-redundant local base64 copies.
    const fullBundle =
      kind === "playgroundSessions" ||
      (kind === "conversations" && (hints.size === 0 || hints.has("full")));
    if (fullBundle) {
      await evictMediaBase64After(userId, pushed);
      // Inlined local-only refs got server rows; adopt their expiry locally
      // so future edits to those entities mirror instead of going stale.
      if (kind === "conversations") await adoptRefSyncExpiry(userId, pushed);
    }
  }
}

// logEnrich row -> pull the authoritative upstream record for the request and
// patch the local request_logs row. A not-yet-logged-upstream result throws so
// the backoff retries; an enrichment write resolves (row deleted).
async function drainLogEnrich(userId: number, row: OutboxRow): Promise<void> {
  const payload = row.payload
    ? (JSON.parse(row.payload) as { requestId?: string })
    : null;
  const requestId = payload?.requestId;
  if (!requestId) return; // nothing to do; drop the row.
  await enrichRequestLogFromUpstream(userId, row.id, requestId);
}

export async function drainPending(userId: number): Promise<DrainResult> {
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
    .from(localPendingTasks)
    .where(
      or(
        isNull(localPendingTasks.nextAttemptAt),
        lte(localPendingTasks.nextAttemptAt, now),
      ),
    )
    .orderBy(asc(localPendingTasks.queuedAt));
  result.total = rows.length;
  for (const row of rows) {
    if (row.attempts >= MAX_PENDING_ATTEMPTS) {
      // Already dead-lettered on a previous drain; stays visible in the sync
      // badge but must not re-toast on every drain/page load.
      continue;
    }
    try {
      await TASK_HANDLERS[row.taskType](userId, row);
      // seq guard: an enqueue that landed mid-push keeps the row alive for
      // the next drain instead of silently losing its scope.
      await local.db
        .delete(localPendingTasks)
        .where(
          and(
            eq(localPendingTasks.taskType, row.taskType),
            eq(localPendingTasks.kind, row.kind),
            eq(localPendingTasks.id, row.id),
            eq(localPendingTasks.seq, row.seq),
          ),
        );
      result.succeeded++;
    } catch (err) {
      const nextAttempts = row.attempts + 1;
      const nextAttemptAt = new Date(
        Date.now() + nextAttemptDelay(nextAttempts),
      );
      // Partial conv pushes can hit server-side gaps a retry of the same
      // delta can never fix (e.g. FK to a parent message that never landed);
      // escalate the retry to a full-bundle rebuild, which is self-healing.
      const escalate =
        row.taskType === "sync" &&
        row.kind === "conversations" &&
        row.hint != null &&
        row.hint !== "full";
      await local.db
        .update(localPendingTasks)
        .set({
          attempts: nextAttempts,
          nextAttemptAt,
          lastError: String(err),
          ...(escalate ? { hint: "full", msgIds: null } : {}),
        })
        .where(
          and(
            eq(localPendingTasks.taskType, row.taskType),
            eq(localPendingTasks.kind, row.kind),
            eq(localPendingTasks.id, row.id),
          ),
        );
      if (nextAttempts >= MAX_PENDING_ATTEMPTS) {
        logger.warn("Pending task exhausted retries", {
          context: "local-db.pending-sync",
          taskType: row.taskType,
          kind: row.kind,
          id: row.id,
          op: row.op,
          lastError: String(err),
        });
        // Only sync tasks surface in the sync badge / DLQ.
        if (row.taskType === "sync") {
          result.dead.push({ kind: row.kind as SyncKindName, id: row.id });
        }
      } else {
        result.retried++;
      }
    }
  }
  // Sister tabs refresh sync-state + badges on drain success.
  if (result.succeeded > 0 || result.dead.length > 0) {
    broadcastInvalidate([queryKeys.pendingSync(), queryKeys.syncState()]);
  }
  return result;
}

// Lock-guarded drain; null = another tab holds the drain lock.
export async function drainLocked(userId: number): Promise<DrainResult | null> {
  const lockKey = `drain:${userId}`;
  if (!(await acquireLock(lockKey))) return null;
  try {
    return await drainPending(userId);
  } finally {
    releaseLock(lockKey);
  }
}

// Fire-and-forget wrapper shared by the scheduler tick and drainSoon.
export async function safeDrain(userId: number): Promise<void> {
  try {
    await drainLocked(userId);
  } catch (err) {
    logger.warn("drainPending failed", {
      context: "local-db.pending-sync",
      userId,
      error: String(err),
    });
  }
}

const DRAIN_SOON_MS = 250;
const drainTimers = new Map<number, ReturnType<typeof setTimeout>>();

// Debounced near-immediate drain after an enqueue: bursts (drawer save that
// touches row + bindings, multi-message persist) coalesce into one push.
export function drainSoon(userId: number): void {
  const prev = drainTimers.get(userId);
  if (prev) clearTimeout(prev);
  drainTimers.set(
    userId,
    setTimeout(() => {
      drainTimers.delete(userId);
      void safeDrain(userId);
    }, DRAIN_SOON_MS),
  );
}

// Direct enrollment/removal (sync-hook) supersedes anything queued for the
// row: a stale queued patch would re-enroll a just-removed row (keepExpiry
// falls back to the default TTL) and a stale queued delete would wipe a
// just-re-enrolled one.
export async function clearPending(
  userId: number,
  kind: SyncKindName,
  id: string,
): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(localPendingTasks)
    .where(
      and(
        eq(localPendingTasks.taskType, "sync"),
        eq(localPendingTasks.kind, kind),
        eq(localPendingTasks.id, id),
      ),
    );
}

// Reads every queued SYNC row so UI surfaces (SyncBadge) can render pending
// state. logEnrich tasks are invisible background work, excluded.
export async function readPendingSync(
  userId: number,
): Promise<PendingSyncRow[]> {
  const local = await getLocalDb(userId);
  if (!local) return [];
  const rows = await local.db
    .select()
    .from(localPendingTasks)
    .where(eq(localPendingTasks.taskType, "sync"));
  return rows.map((r) => ({
    kind: r.kind as SyncKindName,
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
      .update(localPendingTasks)
      .set({ attempts: 0, nextAttemptAt: null, lastError: null })
      .where(eq(localPendingTasks.taskType, "sync"));
    return;
  }
  // Composite PK (taskType, kind, id). No clean tuple IN, so update per-kind.
  const byKind = new Map<SyncKindName, string[]>();
  for (const t of targets) {
    const arr = byKind.get(t.kind) ?? [];
    arr.push(t.id);
    byKind.set(t.kind, arr);
  }
  for (const [kind, ids] of byKind) {
    await local.db
      .update(localPendingTasks)
      .set({ attempts: 0, nextAttemptAt: null, lastError: null })
      .where(
        and(
          eq(localPendingTasks.taskType, "sync"),
          eq(localPendingTasks.kind, kind),
          inArray(localPendingTasks.id, ids),
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
