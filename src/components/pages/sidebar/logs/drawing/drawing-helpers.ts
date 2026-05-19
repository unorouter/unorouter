import { msg, type TranslationKey } from "@/lib/config/constants";
import type { Midjourney } from "@/openapi";
import { dayjs } from "@/lib/utils/format/date";

export { formatMsTimestamp as formatMjTimestamp } from "@/lib/utils/format/date";
export { parsePercent as parseProgress } from "@/lib/utils/format/number";

const MJ_STATUS_KEYS: Record<string, TranslationKey> = {
  NOT_START: msg("LOGS.DRAWING.STATUS.NOT_START"),
  SUBMITTED: msg("LOGS.DRAWING.STATUS.SUBMITTED"),
  IN_PROGRESS: msg("LOGS.DRAWING.STATUS.IN_PROGRESS"),
  SUCCESS: msg("LOGS.DRAWING.STATUS.SUCCESS"),
  FAILURE: msg("LOGS.DRAWING.STATUS.FAILURE"),
  MODAL: msg("LOGS.DRAWING.STATUS.MODAL"),
};

/** Translation key for a Midjourney status. Returns null for empty/unknown
 *  values so the caller can render the raw upstream string verbatim. */
export function getMjStatusKey(status: string | undefined): TranslationKey | null {
  if (!status) return null;
  return MJ_STATUS_KEYS[status.toUpperCase()] ?? null;
}

export type DrawingRow = NonNullable<Midjourney>;

const MJ_STATUS = {
  NOT_START: "NOT_START",
  SUBMITTED: "SUBMITTED",
  IN_PROGRESS: "IN_PROGRESS",
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
  MODAL: "MODAL",
} as const;

type MjStatus = (typeof MJ_STATUS)[keyof typeof MJ_STATUS];

export function getMjStatusColor(status: string): string {
  const normalized = status?.toUpperCase() as MjStatus;
  switch (normalized) {
    case MJ_STATUS.SUCCESS:
      return "bg-green-500/10 text-green-700 dark:text-green-400";
    case MJ_STATUS.FAILURE:
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    case MJ_STATUS.IN_PROGRESS:
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case MJ_STATUS.SUBMITTED:
    case MJ_STATUS.MODAL:
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case MJ_STATUS.NOT_START:
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}


const MJ_ACTION = {
  IMAGINE: "IMAGINE",
  UPSCALE: "UPSCALE",
  VARIATION: "VARIATION",
  REROLL: "REROLL",
  DESCRIBE: "DESCRIBE",
  BLEND: "BLEND",
  ZOOM: "ZOOM",
  SHORTEN: "SHORTEN",
  HIGH_VARIATION: "HIGH_VARIATION",
  LOW_VARIATION: "LOW_VARIATION",
  PAN: "PAN",
  INPAINT: "INPAINT",
  OUTPAINT: "OUTPAINT",
  CUSTOM_ZOOM: "CUSTOM_ZOOM",
  MODAL: "MODAL",
  SWAP_FACE: "SWAP_FACE",
  EDITS: "EDITS",
  VIDEO: "VIDEO",
} as const;

export function getMjActionColor(action: string): string {
  const normalized = action?.toUpperCase();
  switch (normalized) {
    case MJ_ACTION.IMAGINE:
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case MJ_ACTION.UPSCALE:
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case MJ_ACTION.VIDEO:
      return "bg-pink-500/10 text-pink-700 dark:text-pink-400";
    case MJ_ACTION.EDITS:
    case MJ_ACTION.INPAINT:
    case MJ_ACTION.OUTPAINT:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case MJ_ACTION.VARIATION:
    case MJ_ACTION.HIGH_VARIATION:
    case MJ_ACTION.LOW_VARIATION:
      return "bg-teal-500/10 text-teal-700 dark:text-teal-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function formatMjDuration(
  submitMs: number,
  finishMs: number,
): {
  durationSec: number;
  isWarning: boolean;
} | null {
  if (!submitMs || !finishMs || finishMs < submitMs) return null;
  const durationSec = (finishMs - submitMs) / 1000;
  return { durationSec, isWarning: durationSec > 60 };
}

export interface DrawingFilterValues {
  mj_id?: string;
  start_date?: string;
  end_date?: string;
}

export function buildDrawingFilters(
  columnFilters: Array<{ id: string; value: unknown }>,
  pagination: { pageIndex: number; pageSize: number },
): {
  filterValues: DrawingFilterValues;
  queryFilters: {
    p?: number;
    page_size?: number;
    mj_id?: string;
    start_timestamp?: string;
    end_timestamp?: string;
  };
} {
  const filterValues: DrawingFilterValues = {};
  for (const f of columnFilters) {
    if (typeof f.value === "string" && f.value) {
      (filterValues as Record<string, string>)[f.id] = f.value;
    }
  }

  const startMs = filterValues.start_date
    ? dayjs(filterValues.start_date).valueOf()
    : dayjs().startOf("day").valueOf();
  const endMs = filterValues.end_date
    ? dayjs(filterValues.end_date).valueOf()
    : dayjs().endOf("day").valueOf();

  return {
    filterValues,
    queryFilters: {
      p: pagination.pageIndex + 1,
      page_size: pagination.pageSize,
      mj_id: filterValues.mj_id || undefined,
      start_timestamp: String(startMs),
      end_timestamp: String(endMs),
    },
  };
}
