"use client";

import { localPendingTasks, type PendingSyncOp } from "@/lib/db/schema/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { SyncKindName } from "@/lib/validation/sync-constants";
import type { QueryClient } from "@tanstack/react-query";
import { and, eq, inArray } from "drizzle-orm";
import { getLocalDb } from "../../client";
import { buildPendingPushes, type ConvSyncHint } from "../build-payload";
import { adoptRefSyncExpiry, evictMediaBase64After } from "../evict-media";
import { drainPending, enqueueTask } from "./queue";
import type {
  CoalescePatch,
  DrainResult,
  EnqueueInput,
  OutboxRow,
  TaskHandler,
} from "./types";

// The "sync" task type: pushes local entity state to the sync API. Owns its
// scope-hint coalescing, full-bundle escalation on retry, dead-lettering, and
// the badge-facing read/clear/retry API. The queue engine stays sync-agnostic.

export type PendingSyncRow = {
  kind: SyncKindName;
  id: string;
  op: PendingSyncOp;
  attempts: number;
  lastError: string | null;
};

export type { DrainResult };

// Sync scope, serialized into the row's generic `payload` JSON. Only
// conversations carry a hint/msgIds; other kinds have an empty payload.
type SyncPayload = { hint?: string; msgIds?: string[] };

function readPayload(row: OutboxRow | undefined): SyncPayload {
  return row?.payload ? (JSON.parse(row.payload) as SyncPayload) : {};
}

export function enqueueSync(
  userId: number,
  kind: SyncKindName,
  id: string,
  op: PendingSyncOp = "patch",
  opts?: { hint?: ConvSyncHint; msgIds?: string[] },
): Promise<void> {
  return enqueueTask({
    userId,
    taskType: "sync",
    kind,
    id,
    op,
    hint: opts?.hint,
    msgIds: opts?.msgIds,
  });
}

// Coalesce: union conversation scope hints + msgIds with what's already queued
// so a merged row keeps its full scope. "full" absorbs every partial scope.
// The merged scope serializes into the generic payload JSON.
function coalesce(existing: OutboxRow | undefined, next: EnqueueInput): CoalescePatch {
  const op = next.op ?? "patch";
  // A queued delete already implies the row is gone; a later patch is a no-op.
  if (existing?.op === "delete" && op === "patch") return { op, skip: true };
  if (op !== "patch" || next.kind !== "conversations") return { op };

  const prev = existing?.op === "patch" ? readPayload(existing) : {};
  const hints = new Set<string>(prev.hint ? prev.hint.split(",") : []);
  hints.add(next.hint ?? "full");
  const hint = hints.has("full") ? "full" : [...hints].join(",");

  let msgIds: string[] | undefined;
  if (hint !== "full") {
    const ids = new Set<string>(prev.msgIds ?? []);
    for (const m of next.msgIds ?? []) ids.add(m);
    if (ids.size > 0) msgIds = [...ids];
  }
  const payload: SyncPayload = { hint, ...(msgIds ? { msgIds } : {}) };
  return { op, payload: JSON.stringify(payload) };
}

// One sync row -> wire. Rebuilds payload(s) from the local DB; a missing local
// row means it was deleted before drain (nothing to push).
async function drain(userId: number, row: OutboxRow): Promise<void> {
  const kind = row.kind as SyncKindName;
  if (row.op === "delete") {
    const res = await rpc.api.ai.sync({ kind })({ id: row.id }).delete();
    // Row already gone server-side (other-device delete, TTL sweep): the
    // delete's goal is met; retrying 404s only dead-letters a no-op.
    if ((res.error as { status?: number } | null)?.status === 404) return;
    handleElysia(res);
    return;
  }
  const scope = readPayload(row);
  const hints = new Set<ConvSyncHint>(
    (scope.hint ? scope.hint.split(",") : []) as ConvSyncHint[],
  );
  const pushes = await buildPendingPushes(
    userId,
    kind,
    row.id,
    hints,
    scope.msgIds ?? [],
  );
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
      // Inlined local-only refs got server rows; adopt their expiry locally so
      // future edits to those entities mirror instead of going stale.
      if (kind === "conversations") await adoptRefSyncExpiry(userId, pushed);
    }
  }
}

// Partial conv pushes can hit server-side gaps a delta retry can never fix
// (e.g. FK to a parent message that never landed); escalate to a full-bundle
// rebuild, which is self-healing.
function onRetry(row: OutboxRow): Partial<OutboxRow> {
  if (row.kind !== "conversations") return {};
  const scope = readPayload(row);
  if (scope.hint == null || scope.hint === "full") return {};
  return { payload: JSON.stringify({ hint: "full" } satisfies SyncPayload) };
}

function onExhausted(row: OutboxRow, result: DrainResult): void {
  result.dead.push({ kind: row.kind as SyncKindName, id: row.id });
}

export const syncHandler: TaskHandler = {
  coalesce,
  drain,
  onRetry,
  onExhausted,
};

// ---- Sync-only badge/DLQ API (other task types are invisible background work).

// Direct enrollment/removal (sync-hook) supersedes anything queued for the row:
// a stale queued patch would re-enroll a just-removed row and a stale queued
// delete would wipe a just-re-enrolled one.
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

// Message ids queued in the outbox for a conversation's "msgs" scope. Lets
// reconcile keep not-yet-pushed messages instead of treating them as stale.
export async function readOutboxMsgIds(
  userId: number,
  convId: string,
): Promise<Set<string>> {
  const local = await getLocalDb(userId);
  if (!local) return new Set();
  const row = (
    await local.db
      .select()
      .from(localPendingTasks)
      .where(
        and(
          eq(localPendingTasks.taskType, "sync"),
          eq(localPendingTasks.kind, "conversations"),
          eq(localPendingTasks.id, convId),
        ),
      )
      .limit(1)
  )[0];
  return new Set(readPayload(row).msgIds ?? []);
}

// Every queued SYNC row for the badge. logEnrich rows are excluded.
export async function readPendingSync(userId: number): Promise<PendingSyncRow[]> {
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

// Resets attempts so the next drain retries the row. Manual retry buttons.
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
  // Composite PK (taskType, kind, id); no clean tuple IN, so update per-kind.
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
