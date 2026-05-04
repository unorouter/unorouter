import { getV1VideoGenerationsTaskId, postV1VideoGenerations } from "@/openapi";
import { msg } from "@/lib/config/constants";
import { logger } from "@/lib/utils/logger";

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
