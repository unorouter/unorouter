import type { Midjourney } from "@/openapi";

export type DrawingRow = NonNullable<Midjourney>;

export const MJ_STATUS = {
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

export function getMjStatusLabel(status: string): string {
  const normalized = status?.toUpperCase();
  if (!normalized) return "—";
  return (
    {
      NOT_START: "Not Started",
      SUBMITTED: "Submitted",
      IN_PROGRESS: "In Progress",
      SUCCESS: "Success",
      FAILURE: "Failure",
      MODAL: "Modal",
    }[normalized] ?? status
  );
}

export const MJ_ACTION = {
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

export function formatMjDuration(submitMs: number, finishMs: number): {
  durationSec: number;
  isWarning: boolean;
} | null {
  if (!submitMs || !finishMs || finishMs < submitMs) return null;
  const durationSec = (finishMs - submitMs) / 1000;
  return { durationSec, isWarning: durationSec > 60 };
}

export function formatMjTimestamp(ms: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function parseProgress(progress: string): number {
  if (!progress) return 0;
  const m = progress.match(/(\d+)%/);
  if (!m) return 0;
  return Math.min(100, Math.max(0, parseInt(m[1], 10)));
}
