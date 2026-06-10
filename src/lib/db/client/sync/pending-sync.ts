"use client";

import { localPendingSync, type PendingSyncOp } from "@/lib/db/schema/client";
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
import { evictMediaBase64After } from "./evict-media";
import { acquireLock, releaseLock } from "./resource-lock";

// Outbox writer + drainer, the single push path to the sync API; the drainer
// rebuilds payloads from the local DB. Retries with backoff ride the same rows.

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
};

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
  const run = enqueueChain.then(() => doEnqueue(userId, kind, id, op, opts));
  enqueueChain = run.catch(() => {});
  return run;
}

async function doEnqueue(
  userId: number,
  kind: SyncKindName,
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
      .from(localPendingSync)
      .where(and(eq(localPendingSync.kind, kind), eq(localPendingSync.id, id)))
      .limit(1)
  )[0];
  // Guard delete->patch: queued delete already implies row is gone.
  if (existing?.op === "delete" && op === "patch") return;

  let hint: string | null = null;
  let msgIds: string | null = null;
  if (op === "patch" && kind === "conversations") {
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
    seq: (existing?.seq ?? 0) + 1,
  };
  await local.db
    .insert(localPendingSync)
    .values({ kind, id, ...set })
    .onConflictDoUpdate({
      target: [localPendingSync.kind, localPendingSync.id],
      set,
    });
}

type OutboxRow = typeof localPendingSync.$inferSelect;

// One outbox row -> wire. Rebuilds payload(s) from the local DB; a missing
// local row means it was deleted before drain (nothing to push).
async function pushRow(userId: number, row: OutboxRow): Promise<void> {
  if (row.op === "delete") {
    handleElysia(
      await rpc.api.ai.sync({ kind: row.kind })({ id: row.id }).delete(),
    );
    return;
  }
  const hints = new Set<ConvSyncHint>(
    (row.hint ? row.hint.split(",") : []) as ConvSyncHint[],
  );
  const msgIds = row.msgIds ? (JSON.parse(row.msgIds) as string[]) : [];
  const pushes = await buildPendingPushes(
    userId,
    row.kind,
    row.id,
    hints,
    msgIds,
  );
  for (const push of pushes ?? []) {
    const pushed = handleElysia(
      await rpc.api.ai.sync({ kind: row.kind })({ id: row.id }).post({
        payload: push.payload,
        keepExpiry: true,
        mergeMode: push.mergeMode,
      }),
    );
    // Full bundle pushes return media with fresh R2 keys; evict the
    // now-redundant local base64 copies.
    const fullBundle =
      row.kind === "playgroundSessions" ||
      (row.kind === "conversations" && (hints.size === 0 || hints.has("full")));
    if (fullBundle) await evictMediaBase64After(userId, pushed);
  }
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
      await pushRow(userId, row);
      // seq guard: an enqueue that landed mid-push keeps the row alive for
      // the next drain instead of silently losing its scope.
      await local.db
        .delete(localPendingSync)
        .where(
          and(
            eq(localPendingSync.kind, row.kind),
            eq(localPendingSync.id, row.id),
            eq(localPendingSync.seq, row.seq),
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
        row.kind === "conversations" && row.hint != null && row.hint !== "full";
      await local.db
        .update(localPendingSync)
        .set({
          attempts: nextAttempts,
          nextAttemptAt,
          lastError: String(err),
          ...(escalate ? { hint: "full", msgIds: null } : {}),
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
    broadcastInvalidate([queryKeys.pendingSync(), queryKeys.syncState()]);
  }
  return result;
}

// Lock-guarded drain shared by the scheduler tick and drainSoon.
export async function safeDrain(userId: number): Promise<void> {
  const lockKey = `drain:${userId}`;
  if (!acquireLock(lockKey)) return;
  try {
    await drainPending(userId);
  } catch (err) {
    logger.warn("drainPending failed", {
      context: "local-db.pending-sync",
      userId,
      error: String(err),
    });
  } finally {
    releaseLock(lockKey);
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
    .delete(localPendingSync)
    .where(and(eq(localPendingSync.kind, kind), eq(localPendingSync.id, id)));
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
        and(eq(localPendingSync.kind, kind), inArray(localPendingSync.id, ids)),
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
