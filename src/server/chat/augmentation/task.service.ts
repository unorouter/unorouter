import { getV1VideoGenerationsTaskId, postV1VideoGenerations } from "@/openapi";
import { msg } from "@/lib/config/constants";
import { downloadAndUpload } from "@/lib/config/r2";
import { assertFound } from "@/lib/db/assertions";
import { getDb } from "@/lib/db/client";
import { conversations, messageItems, messages } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getGuestConvIds } from "@/server/constants";
import type { FinalizeTaskBody } from "@/lib/validation/chat";
import type { Cookie } from "elysia";
import { and, asc, eq } from "drizzle-orm";

export type TaskStatus =
  | "NOT_START"
  | "SUBMITTED"
  | "QUEUED"
  | "IN_PROGRESS"
  | "SUCCESS"
  | "FAILURE"
  | "UNKNOWN";

export type TaskSubmitResult = {
  taskId: string;
  status: TaskStatus;
  progress: string;
};

export type TaskFetchResult = {
  status: TaskStatus;
  progress: string;
  resultUrl?: string;
};

type VideoGenData = {
  task_id?: string;
  id?: string;
  status?: string;
};

type VideoFetchData = {
  task_id?: string;
  status?: string;
  progress?: string;
  result_url?: string;
};

/**
 * Map new-api's public task status vocabulary (lowercase: "queued",
 * "in_progress", "completed", "failed", "unknown") to the UI vocabulary
 * used by TaskCard (uppercase: SUBMITTED / QUEUED / IN_PROGRESS /
 * SUCCESS / FAILURE / UNKNOWN).
 */
function normalizeStatus(raw: string | undefined): TaskStatus {
  if (!raw) return "SUBMITTED";
  const lower = raw.toLowerCase();
  if (lower === "completed" || lower === "success") return "SUCCESS";
  if (lower === "failed" || lower === "failure" || lower === "error")
    return "FAILURE";
  if (lower === "queued" || lower === "pending") return "QUEUED";
  if (lower === "in_progress" || lower === "processing" || lower === "running")
    return "IN_PROGRESS";
  if (lower === "submitted" || lower === "not_start") return "SUBMITTED";
  return "UNKNOWN";
}

/** Submit a video generation task to new-api. */
export async function submitVideoTask(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<TaskSubmitResult> {
  const res = await postV1VideoGenerations({
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt }),
  });

  const raw = res.data as { data?: VideoGenData } | VideoGenData | null;
  const payload =
    raw && typeof raw === "object" && "data" in raw && raw.data
      ? (raw.data as VideoGenData)
      : (raw as VideoGenData);

  const taskId = payload?.task_id ?? payload?.id;
  if (!taskId) {
    logger.error("No task_id in video generation response", {
      context: "task.submit",
      model,
      raw: JSON.stringify(raw).slice(0, 200),
    });
    throw new Error(msg("ERRORS.NO_TASK_ID"));
  }

  return {
    taskId,
    status: normalizeStatus(payload?.status),
    progress: "10%",
  };
}

/**
 * Finalize a completed video task: rehost the upstream URL to R2 and rewrite
 * the persisted `task` item to a `text` item containing the markdown video
 * tag. Guest cookies (userId=0) are validated via the guest-conv list since
 * the conv row carries no real userId for them.
 */
export async function finalizeVideoTask(
  userId: number,
  cookie: Record<string, Cookie<unknown>>,
  convId: string,
  body: FinalizeTaskBody,
) {
  const isGuest = userId === 0;
  if (isGuest) {
    const guestConvIds = getGuestConvIds(cookie);
    if (!guestConvIds.includes(convId))
      throw new Error(msg("ERRORS.NOT_FOUND"));
  }

  const db = getDb();
  const convRows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
    .limit(1);
  assertFound(convRows);

  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, body.msgId), eq(messages.convId, convId)))
    .limit(1);
  assertFound(rows);

  const groupKey = uid(8);
  const r2Url = await downloadAndUpload(body.resultUrl, convId, groupKey);

  const items = await db
    .select()
    .from(messageItems)
    .where(eq(messageItems.messageId, body.msgId))
    .orderBy(asc(messageItems.sequenceIndex));

  const updatedItems = items.map((it) => {
    if (
      it.type === "task" &&
      (it.data as Record<string, unknown>).task_id === body.taskId
    ) {
      return {
        ...it,
        type: "text",
        data: { text: `![video](${r2Url})` },
      };
    }
    return it;
  });

  await db.transaction(async (tx) => {
    await tx.delete(messageItems).where(eq(messageItems.messageId, body.msgId));
    if (updatedItems.length > 0) {
      await tx.insert(messageItems).values(
        updatedItems.map((it, seq) => ({
          id: it.id,
          messageId: body.msgId,
          sequenceIndex: seq,
          outputIndex: it.outputIndex,
          type: it.type,
          data: it.data,
        })),
      );
    }
  });

  return { items: updatedItems };
}

/** Poll the status of a video generation task from new-api. */
export async function fetchVideoTaskStatus(
  apiKey: string,
  taskId: string,
): Promise<TaskFetchResult> {
  const res = await getV1VideoGenerationsTaskId(taskId, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const raw = res.data as { data?: VideoFetchData } | VideoFetchData | null;
  const payload =
    raw && typeof raw === "object" && "data" in raw && raw.data
      ? (raw.data as VideoFetchData)
      : (raw as VideoFetchData);

  return {
    status: normalizeStatus(payload?.status),
    progress: payload?.progress ?? "0%",
    resultUrl: payload?.result_url ?? undefined,
  };
}
