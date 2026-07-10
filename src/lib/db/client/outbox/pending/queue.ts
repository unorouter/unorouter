"use client";

import { localPendingTasks } from "@/lib/db/schema/client";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { logger } from "@/lib/utils/logger";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { getLocalDb } from "../../client";
import { enrichRequestLogFromUpstream } from "../log-enrich";

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [0, 30_000, 120_000, 480_000, 1_800_000];
const backoff = (attempts: number) =>
  BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)] ?? 0;

const KIND = "";

export async function enqueueLogEnrich(
  userId: number,
  msgId: string,
  requestId: string,
): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;

  const existing = (
    await local.db
      .select({ seq: localPendingTasks.seq })
      .from(localPendingTasks)
      .where(
        and(
          eq(localPendingTasks.taskType, "logEnrich"),
          eq(localPendingTasks.kind, KIND),
          eq(localPendingTasks.id, msgId),
        ),
      )
      .limit(1)
  )[0];

  const set = {
    op: "patch" as const,
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    payload: JSON.stringify({ requestId }),
    seq: (existing?.seq ?? 0) + 1,
  };
  await local.db
    .insert(localPendingTasks)
    .values({ taskType: "logEnrich", kind: KIND, id: msgId, ...set })
    .onConflictDoUpdate({
      target: [
        localPendingTasks.taskType,
        localPendingTasks.kind,
        localPendingTasks.id,
      ],
      set,
    });
}

async function runTask(userId: number, msgId: string, payload: string | null) {
  const requestId = payload
    ? (JSON.parse(payload) as { requestId?: string }).requestId
    : undefined;
  if (!requestId) return; // nothing to enrich; the row is dropped
  await enrichRequestLogFromUpstream(userId, msgId, requestId);
}

async function drainPending(userId: number): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;

  const now = new Date();
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

  if (rows.length > 0) logChatDebug("pending.drain", { count: rows.length });
  for (const row of rows) {
    if (row.attempts >= MAX_ATTEMPTS) continue; // dead-lettered; stays for record
    try {
      await runTask(userId, row.id, row.payload);
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
    } catch (err) {
      const attempts = row.attempts + 1;
      await local.db
        .update(localPendingTasks)
        .set({
          attempts,
          nextAttemptAt: new Date(Date.now() + backoff(attempts)),
          lastError: String(err),
        })
        .where(
          and(
            eq(localPendingTasks.taskType, row.taskType),
            eq(localPendingTasks.kind, row.kind),
            eq(localPendingTasks.id, row.id),
          ),
        );
      logChatDebug("pending.task_error", {
        id: row.id,
        attempts,
        error: String(err).slice(0, 200),
      });
      if (attempts >= MAX_ATTEMPTS) {
        logChatDebug("pending.exhausted", { id: row.id });
        logger.warn("Pending task exhausted retries", {
          context: "local-db.pending-queue",
          id: row.id,
          lastError: String(err),
        });
      }
    }
  }
}

const inFlight = new Map<number, Promise<void>>();

export function drain(userId: number): Promise<void> {
  const running = inFlight.get(userId);
  if (running) return running;
  const run = drainPending(userId)
    .catch((err) =>
      logger.warn("drainPending failed", {
        context: "local-db.pending-queue",
        userId,
        error: String(err),
      }),
    )
    .finally(() => inFlight.delete(userId));
  inFlight.set(userId, run);
  return run;
}

const DRAIN_SOON_MS = 250;
const drainTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function drainSoon(userId: number): void {
  const prev = drainTimers.get(userId);
  if (prev) clearTimeout(prev);
  drainTimers.set(
    userId,
    setTimeout(() => {
      drainTimers.delete(userId);
      void drain(userId);
    }, DRAIN_SOON_MS),
  );
}
