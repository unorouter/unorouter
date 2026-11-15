import { isOneOf } from "@/lib/utils/base";
import type { TranslationKey } from "@/lib/config/constants";
import { dayjs } from "@/lib/utils/format/date";
import type { TaskDto } from "@/openapi";

export type TaskRow = NonNullable<TaskDto>;

const isTaskStatus = isOneOf([
  "NOT_START",
  "SUBMITTED",
  "IN_PROGRESS",
  "SUCCESS",
  "FAILURE",
  "QUEUED",
  "UNKNOWN",
] as const);

const STATUS_COLOR: Partial<Record<string, string>> = {
  SUCCESS: "bg-green-500/10 text-green-700 dark:text-green-400",
  FAILURE: "bg-red-500/10 text-red-700 dark:text-red-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  QUEUED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  SUBMITTED: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

export function getTaskStatusColor(status: string): string {
  return (
    STATUS_COLOR[status?.toUpperCase()] ?? "bg-muted text-muted-foreground"
  );
}

export function getTaskStatusKey(
  status: string | undefined,
): TranslationKey | null {
  const s = status?.toUpperCase();
  return isTaskStatus(s) ? `LOGS.TASK.STATUS_VALUES.${s}` : null;
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

const VIDEO_ACTIONS = new Set([
  "GENERATE",
  "TEXT_GENERATE",
  "IMAGE_GENERATE",
  "TEXT2VIDEO",
  "IMAGE2VIDEO",
]);

export function isVideoTaskAction(action: string): boolean {
  return VIDEO_ACTIONS.has(action?.toUpperCase());
}

export function isAudioTask(platform: string): boolean {
  return platform?.toLowerCase() === "suno";
}

export interface TaskFilterValues {
  task_id?: string;
  start_date?: string;
  end_date?: string;
}

const TASK_FILTER_KEYS: readonly (keyof TaskFilterValues)[] = [
  "task_id",
  "start_date",
  "end_date",
];

const isTaskFilterKey = isOneOf(TASK_FILTER_KEYS);

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
    if (typeof f.value === "string" && f.value && isTaskFilterKey(f.id)) {
      filterValues[f.id] = f.value;
    }
  }

  const startSec = (
    filterValues.start_date
      ? dayjs(filterValues.start_date)
      : dayjs().startOf("day")
  ).unix();
  const endSec = (
    filterValues.end_date ? dayjs(filterValues.end_date) : dayjs().endOf("day")
  ).unix();

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
