import type { TaskDto } from "@/openapi";

export type TaskRow = NonNullable<TaskDto>;

export const TASK_STATUS = {
  NOT_START: "NOT_START",
  SUBMITTED: "SUBMITTED",
  IN_PROGRESS: "IN_PROGRESS",
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
  QUEUED: "QUEUED",
  UNKNOWN: "UNKNOWN",
} as const;

export function getTaskStatusColor(status: string): string {
  const normalized = status?.toUpperCase();
  switch (normalized) {
    case TASK_STATUS.SUCCESS:
      return "bg-green-500/10 text-green-700 dark:text-green-400";
    case TASK_STATUS.FAILURE:
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    case TASK_STATUS.IN_PROGRESS:
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case TASK_STATUS.QUEUED:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case TASK_STATUS.SUBMITTED:
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getTaskStatusLabel(status: string): string {
  const normalized = status?.toUpperCase();
  if (!normalized) return "—";
  return (
    {
      NOT_START: "Not Started",
      SUBMITTED: "Submitted",
      IN_PROGRESS: "In Progress",
      SUCCESS: "Success",
      FAILURE: "Failure",
      QUEUED: "Queued",
      UNKNOWN: "Unknown",
    }[normalized] ?? status
  );
}

export function formatTaskDuration(submitSec: number, finishSec: number): {
  durationSec: number;
  isWarning: boolean;
} | null {
  if (!submitSec || !finishSec || finishSec < submitSec) return null;
  const durationSec = finishSec - submitSec;
  return { durationSec, isWarning: durationSec > 300 };
}

export function formatTaskTimestamp(sec: number): string {
  if (!sec) return "—";
  const d = new Date(sec * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function isUrlLike(value: string | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

export function isVideoTaskAction(action: string): boolean {
  const normalized = action?.toUpperCase();
  return (
    normalized === "GENERATE" ||
    normalized === "TEXT_GENERATE" ||
    normalized === "IMAGE_GENERATE" ||
    normalized === "TEXT2VIDEO" ||
    normalized === "IMAGE2VIDEO"
  );
}

export function isAudioTask(platform: string): boolean {
  return platform?.toLowerCase() === "suno";
}
