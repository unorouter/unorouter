import { getV1VideoGenerationsTaskId, postV1VideoGenerations } from "@/openapi";
import {
  normalizeTaskStatus,
  unwrapTaskData,
  type UpstreamFetchResp,
  type UpstreamSubmitResp,
} from "@/lib/api/video-task";
import { msg } from "@/lib/config/constants";
import { downloadAndUpload } from "@/lib/config/r2";
import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import { conversations, messageItems, messages } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { FinalizeTaskBody } from "@/lib/validation/chat";
import { and, asc, eq } from "drizzle-orm";

export type TaskStatus =
  | "NOT_START"
  | "SUBMITTED"
  | "QUEUED"
  | "IN_PROGRESS"
  | "SUCCESS"
  | "FAILURE"
  | "UNKNOWN";

type TaskSubmitResult = {
  taskId: string;
  status: TaskStatus;
  progress: string;
};

type TaskFetchResult = {
  status: TaskStatus;
  progress: string;
  resultUrl?: string;
};

function toUiStatus(raw: string | undefined): TaskStatus {
  const canonical = normalizeTaskStatus(raw);
  switch (canonical) {
    case "success":
      return "SUCCESS";
    case "failure":
      return "FAILURE";
    case "queued":
    case "pending":
      return "QUEUED";
    case "in_progress":
    case "processing":
    case "running":
      return "IN_PROGRESS";
    case "submitted":
      return "SUBMITTED";
    default:
      return "UNKNOWN";
  }
}

export async function submitVideoTask(
  apiKey: string,
  model: string,
  prompt: string,
  group?: string | null,
): Promise<TaskSubmitResult> {
  const res = await postV1VideoGenerations({
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // Per-request group override; new-api reads X-Group. Omit for null/auto.
      ...(group && group !== "auto" ? { "X-Group": group } : {}),
    },
    body: JSON.stringify({ model, prompt }),
  });

  const payload = unwrapTaskData<UpstreamSubmitResp>(res.data);
  const taskId = payload?.task_id ?? payload?.id;
  if (!taskId) {
    logger.error("No task_id in video generation response", {
      context: "task.submit",
      model,
      raw: JSON.stringify(res.data).slice(0, 200),
    });
    throw new Error(msg("ERRORS.NO_TASK_ID"));
  }

  return {
    taskId,
    status: toUiStatus(payload?.status),
    progress: "10%",
  };
}

// Rehosts upstream URL to R2 and rewrites the persisted `task` item to a
// `text` item containing markdown video tag.
export async function finalizeVideoTask(
  userId: number,
  convId: string,
  body: FinalizeTaskBody,
) {
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
        type: "text" as const,
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

export async function fetchVideoTaskStatus(
  apiKey: string,
  taskId: string,
): Promise<TaskFetchResult> {
  const res = await getV1VideoGenerationsTaskId(taskId, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const payload = unwrapTaskData<UpstreamFetchResp>(res.data);
  return {
    status: toUiStatus(payload?.status),
    progress: payload?.progress ?? "0%",
    resultUrl: payload?.result_url ?? undefined,
  };
}
