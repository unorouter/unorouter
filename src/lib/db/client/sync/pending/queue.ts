"use client";

import { localPendingTasks } from "@/lib/db/schema/client";
import { logger } from "@/lib/utils/logger";
import type { SyncKindName } from "@/lib/validation/sync-constants";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { getLocalDb } from "../../client";
import { acquireLock, releaseLock } from "../resource-lock";
import { getHandler } from "./registry";
import {
  MAX_PENDING_ATTEMPTS,
  nextAttemptDelay,
  type DrainResult,
  type EnqueueInput,
  type OutboxRow,
} from "./types";

// "" is the non-sync sentinel; the column type is SyncKindName | "".
type KindCol = SyncKindName | "";

// Generic outbox engine: enqueue (with per-handler coalescing), drain (FIFO +
// backoff + dead-letter), and the debounced/locked drain wrappers. It knows
// NOTHING task-specific; every variant rides the handler registry.

// PK can't hold NULL, so non-sync rows store "" for kind. This is the only
// place "" leaks; handlers always see the null-mapped form via rowForHandler.
const KIND_COL = (kind: SyncKindName | null | undefined): KindCol => kind ?? "";

function rowForHandler(row: OutboxRow): OutboxRow {
  return { ...row, kind: row.kind === "" ? null : row.kind } as OutboxRow;
}

// Serialize enqueues: the coalesce read-merge-write would interleave otherwise
// and the second writer would drop the first's merged scope.
let enqueueChain: Promise<unknown> = Promise.resolve();

export function enqueueTask(input: EnqueueInput): Promise<void> {
  const run = enqueueChain.then(() => doEnqueue(input));
  enqueueChain = run.catch(() => {});
  return run;
}

async function doEnqueue(input: EnqueueInput): Promise<void> {
  const local = await getLocalDb(input.userId);
  if (!local) return;
  const kind = KIND_COL(input.kind);

  const existing = (
    await local.db
      .select()
      .from(localPendingTasks)
      .where(
        and(
          eq(localPendingTasks.taskType, input.taskType),
          eq(localPendingTasks.kind, kind),
          eq(localPendingTasks.id, input.id),
        ),
      )
      .limit(1)
  )[0];

  const handler = getHandler(input.taskType);
  const patch = handler.coalesce
    ? handler.coalesce(existing, input)
    : {
        op: input.op ?? "patch",
        payload: input.payload ? JSON.stringify(input.payload) : null,
      };
  if (patch.skip) return;

  const set = {
    op: patch.op,
    attempts: 0, // fresh enqueue resets backoff
    nextAttemptAt: null,
    lastError: null,
    payload: patch.payload ?? null,
    seq: (existing?.seq ?? 0) + 1,
  };
  await local.db
    .insert(localPendingTasks)
    .values({ taskType: input.taskType, kind, id: input.id, ...set })
    .onConflictDoUpdate({
      target: [
        localPendingTasks.taskType,
        localPendingTasks.kind,
        localPendingTasks.id,
      ],
      set,
    });
}

export async function drainPending(userId: number): Promise<DrainResult> {
  const result: DrainResult = { succeeded: 0, retried: 0, dead: [], total: 0 };
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
    // Already dead-lettered on a prior drain; stays visible in the badge but
    // must not re-run / re-toast on every load.
    if (row.attempts >= MAX_PENDING_ATTEMPTS) continue;
    const handler = getHandler(row.taskType);
    try {
      await handler.drain(userId, rowForHandler(row));
      // seq guard: an enqueue that landed mid-drain keeps the row for the
      // next pass instead of silently losing its merged scope.
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
      const nextAttemptAt = new Date(Date.now() + nextAttemptDelay(nextAttempts));
      await local.db
        .update(localPendingTasks)
        .set({
          attempts: nextAttempts,
          nextAttemptAt,
          lastError: String(err),
          ...(handler.onRetry?.(rowForHandler(row)) ?? {}),
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
          context: "local-db.pending-queue",
          taskType: row.taskType,
          kind: row.kind,
          id: row.id,
          op: row.op,
          lastError: String(err),
        });
        handler.onExhausted?.(rowForHandler(row), result);
      } else {
        result.retried++;
      }
    }
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
      context: "local-db.pending-queue",
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
