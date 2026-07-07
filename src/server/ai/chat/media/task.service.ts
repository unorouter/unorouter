import { getV1VideoGenerationsTaskId, postV1VideoGenerations } from "@/openapi";
import {
  normalizeTaskStatus,
  unwrapTaskData,
  type UpstreamFetchResp,
  type UpstreamSubmitResp,
} from "@/lib/api/video-task";
import { msg } from "@/lib/config/constants";
import { downloadGenerationBytes } from "@/lib/config/r2";
import { base64ToDataUri } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { FinalizeTaskBody } from "@/lib/validation/chat";

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

function taskErrorMessage(data: unknown, fallback: string): string {
  const stack: unknown[] = [data];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    const obj = node as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message.trim();
    }
    for (const key of ["error", "data", "output"]) {
      if (key in obj) stack.push(obj[key]);
    }
  }
  return fallback;
}

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
      "Content-Type": "application/json",
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
    throw new Error(taskErrorMessage(res.data, msg("ERRORS.NO_TASK_ID")));
  }

  return {
    taskId,
    status: toUiStatus(payload?.status),
    progress: "10%",
  };
}

// Local-first: video bytes live in the browser (OPFS), same as generated images.
// This route only downloads the upstream result and returns it as a base64 data
// URI (COEP-safe, same-origin); the client persists + renders it locally. No R2:
// a cross-origin R2 URL is blocked by the chat page's COEP require-corp.
export async function finalizeVideoTask(
  _convId: string,
  body: FinalizeTaskBody,
) {
  const bytes = await downloadGenerationBytes(body.resultUrl);
  const dataUri = base64ToDataUri(
    bytes.buffer.toString("base64"),
    bytes.mime.startsWith("video/") ? bytes.mime : "video/mp4",
  );
  return { url: dataUri };
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
