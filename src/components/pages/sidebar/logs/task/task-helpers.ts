import { msg, type TranslationKey } from "@/lib/config/constants";
import { dayjs } from "@/lib/utils/format/date";
import type { TaskDto } from "@/openapi";

export { formatSecTimestamp as formatTaskTimestamp } from "@/lib/utils/format/date";

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

const TASK_STATUS_KEYS: Record<string, TranslationKey> = {
  NOT_START: msg("LOGS.TASK.STATUS_VALUES.NOT_START"),
  SUBMITTED: msg("LOGS.TASK.STATUS_VALUES.SUBMITTED"),
  IN_PROGRESS: msg("LOGS.TASK.STATUS_VALUES.IN_PROGRESS"),
  SUCCESS: msg("LOGS.TASK.STATUS_VALUES.SUCCESS"),
  FAILURE: msg("LOGS.TASK.STATUS_VALUES.FAILURE"),
  QUEUED: msg("LOGS.TASK.STATUS_VALUES.QUEUED"),
  UNKNOWN: msg("LOGS.TASK.STATUS_VALUES.UNKNOWN"),
};

/** Translation key for a task status. Returns null for empty/unknown values. */
export function getTaskStatusKey(
  status: string | undefined,
): TranslationKey | null {
  if (!status) return null;
  return TASK_STATUS_KEYS[status.toUpperCase()] ?? null;
}

export function formatTaskDuration(
  submitSec: number,
  finishSec: number,
): {
  durationSec: number;
  isWarning: boolean;
} | null {
  if (!submitSec || !finishSec || finishSec < submitSec) return null;
  const durationSec = finishSec - submitSec;
  return { durationSec, isWarning: durationSec > 300 };
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

export interface TaskFilterValues {
  task_id?: string;
  start_date?: string;
  end_date?: string;
}

export function buildTaskFilters(
  columnFilters: Array<{ id: string; value: unknown }>,
  pagination: { pageIndex: number; pageSize: number },
): {
  filterValues: TaskFilterValues;
  queryFilters: {
    p?: number;
    page_size?: number;
    task_id?: string;
    start_timestamp?: number;
    end_timestamp?: number;
  };
} {
  const filterValues: TaskFilterValues = {};
  for (const f of columnFilters) {
    if (typeof f.value === "string" && f.value) {
      (filterValues as Record<string, string>)[f.id] = f.value;
    }
  }

  const startSec = filterValues.start_date
    ? Math.floor(dayjs(filterValues.start_date).valueOf() / 1000)
    : Math.floor(dayjs().startOf("day").valueOf() / 1000);
  const endSec = filterValues.end_date
    ? Math.floor(dayjs(filterValues.end_date).valueOf() / 1000)
    : Math.floor(dayjs().endOf("day").valueOf() / 1000);

  return {
    filterValues,
    queryFilters: {
      p: pagination.pageIndex + 1,
      page_size: pagination.pageSize,
      task_id: filterValues.task_id || undefined,
      start_timestamp: startSec,
      end_timestamp: endSec,
    },
  };
}
