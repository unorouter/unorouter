"use client";

import type {
  localPendingTasks,
  PendingSyncOp,
  PendingTaskType,
} from "@/lib/db/schema/client";
import type { SyncKindName } from "@/lib/validation/sync-constants";

export type PendingTaskOp = PendingSyncOp;

// Generic outbox primitives shared by the queue engine and every task handler.
// The optional handler hooks + enqueue fields below (coalesce/onRetry/
// onExhausted, hint/msgIds, dead) are unused by the only live task (logEnrich)
// but kept as the seam for re-adding the Turso mirror-sync handler later.

export const MAX_PENDING_ATTEMPTS = 5;

// Backoff ms by attempts count; index 0 = no prior failure, drain immediately.
export const BACKOFF_SCHEDULE_MS = [0, 30_000, 120_000, 480_000, 1_800_000];

export function nextAttemptDelay(attempts: number): number {
  return (
    BACKOFF_SCHEDULE_MS[Math.min(attempts, BACKOFF_SCHEDULE_MS.length - 1)] ?? 0
  );
}

// A row as stored. `kind` is "" for non-sync tasks; handlers receive the
// null-mapped form via TaskHandler, never the raw "".
export type OutboxRow = typeof localPendingTasks.$inferSelect;

export type DrainResult = {
  succeeded: number;
  retried: number;
  // Rows that exhausted retries (populated by a handler's onExhausted; logEnrich
  // leaves it empty). Reserved for a re-added sync handler's dead-letter badge.
  dead: Array<{ kind: SyncKindName; id: string }>;
  total: number;
};

// What a task type contributes to the queue. The engine owns scheduling,
// backoff, the seq guard and row deletion; a handler owns only its own
// coalescing and wire work.
export type TaskHandler = {
  // Merge an incoming enqueue into what's already queued for the same row.
  // Returns the columns to persist (op + task-specific fields). Default
  // (handler omits this) = last-write-wins on op + payload.
  coalesce?: (existing: OutboxRow | undefined, next: EnqueueInput) => CoalescePatch;
  // Do the deferred work. Throw to retry (rides the backoff); resolve = done
  // (engine deletes the row).
  drain: (userId: number, row: OutboxRow) => Promise<void>;
  // Called once when a row crosses MAX_PENDING_ATTEMPTS. Sync uses it to record
  // a dead-letter target; others can no-op.
  onExhausted?: (row: OutboxRow, result: DrainResult) => void;
  // Per-attempt-failure mutation (e.g. sync escalates a partial conv push to a
  // full-bundle rebuild). Merged into the backoff update.
  onRetry?: (row: OutboxRow) => Partial<OutboxRow>;
};

// Caller-facing enqueue shape (object form, no positional sprawl). `kind`
// accepts null for non-sync tasks; the queue maps it to "" at the DB boundary.
export type EnqueueInput = {
  userId: number;
  taskType: PendingTaskType;
  kind?: SyncKindName | null;
  id: string;
  op?: PendingTaskOp;
  payload?: Record<string, unknown>;
  // Sync-only scope hints, passed straight to the sync coalescer.
  hint?: string;
  msgIds?: string[];
};

// Columns a coalescer returns to persist for the row (engine fills queuedAt,
// attempts reset, seq bump). Task-specific scope rides `payload` JSON.
export type CoalescePatch = {
  op: PendingTaskOp;
  payload?: string | null;
  // true = drop the enqueue entirely (e.g. patch after a queued delete).
  skip?: boolean;
};
