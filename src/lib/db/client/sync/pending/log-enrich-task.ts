"use client";

import { enrichRequestLogFromUpstream } from "../log-enrich";
import { enqueueTask } from "./queue";
import type { OutboxRow, TaskHandler } from "./types";

// The "logEnrich" task type: after a stream settles, pull new-api's
// authoritative cost/tokens/channel for the request and patch the local
// request_logs row. Invisible background work (no badge, no DLQ); a
// not-yet-logged-upstream result throws to ride the queue backoff.

// Enqueue an enrichment for a finished message. kind is null (non-sync).
export function enqueueLogEnrich(
  userId: number,
  msgId: string,
  requestId: string,
): Promise<void> {
  return enqueueTask({
    userId,
    taskType: "logEnrich",
    kind: null,
    id: msgId,
    op: "patch",
    payload: { requestId },
  });
}

async function drain(userId: number, row: OutboxRow): Promise<void> {
  const payload = row.payload
    ? (JSON.parse(row.payload) as { requestId?: string })
    : null;
  const requestId = payload?.requestId;
  if (!requestId) return; // nothing to enrich; drop the row.
  await enrichRequestLogFromUpstream(userId, row.id, requestId);
}

export const logEnrichHandler: TaskHandler = { drain };
