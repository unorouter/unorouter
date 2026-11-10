import { getV1VideoGenerationsTaskId, postV1VideoGenerations } from "@/openapi";
import {
  digErrorMessage,
  normalizeTaskStatus,
  unwrapTaskData,
  type UpstreamFetchResp,
  type UpstreamSubmitResp,
} from "@/lib/api/video-task";
import { msg } from "@/lib/config/constants";
import { bffServiceHeader, groupHeader } from "@/server/constants";
import { downloadGenerationBytes } from "@/lib/config/safe-fetch";
import { base64ToDataUri } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";

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
  failReason?: string;
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
  image?: string,
): Promise<TaskSubmitResult> {
  const res = await postV1VideoGenerations({
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...groupHeader(group),
      ...bffServiceHeader(),
    },
    body: JSON.stringify({ model, prompt, ...(image ? { image } : {}) }),
  });

  const payload = unwrapTaskData<UpstreamSubmitResp>(res.data);
  const taskId = payload?.task_id ?? payload?.id;
  if (!taskId) {
    logger.error("No task_id in video generation response", {
      context: "task.submit",
      model,
      raw: JSON.stringify(res.data).slice(0, 200),
    });
    throw new Error(digErrorMessage(res.data) ?? msg("ERRORS.NO_TASK_ID"));
  }

  return {
    taskId,
    status: toUiStatus(payload?.status),
    progress: "10%",
  };
}

export async function finalizeVideoTask(apiKey: string, taskId: string) {
  const task = await fetchVideoTaskStatus(apiKey, taskId);
  if (task.status !== "SUCCESS" || !task.resultUrl)
    throw new Error(msg("ERRORS.UPSTREAM_FETCH_FAILED"));
  const bytes = await downloadGenerationBytes(task.resultUrl);
  // AI Horde image tasks return webp.
  const isImage = bytes.mime.startsWith("image/");
  const isVideo = bytes.mime.startsWith("video/");
  const mime = isImage || isVideo ? bytes.mime : "video/mp4";
  const dataUri = base64ToDataUri(bytes.buffer.toString("base64"), mime);
  return { url: dataUri, kind: isImage ? "image" : "video" };
}

export async function fetchVideoTaskStatus(
  apiKey: string,
  taskId: string,
): Promise<TaskFetchResult> {
  const res = await getV1VideoGenerationsTaskId(taskId, {
    headers: { Authorization: `Bearer ${apiKey}`, ...bffServiceHeader() },
  });

  const payload = unwrapTaskData<UpstreamFetchResp>(res.data);
  return {
    status: toUiStatus(payload?.status),
    progress: payload?.progress ?? "0%",
    resultUrl: payload?.result_url ?? undefined,
    failReason: payload?.fail_reason?.trim() || undefined,
  };
}
