import type { ResponseDtoPageDataModelLogDataItemsItem } from "@/openapi";
import dayjs from "dayjs";

export type LogRow = NonNullable<ResponseDtoPageDataModelLogDataItemsItem>;

export const LOG_TYPE_ALL = -1;
export const LOG_TYPE_TOPUP = 1;
export const LOG_TYPE_CONSUME = 2;
export const LOG_TYPE_MANAGE = 3;
export const LOG_TYPE_SYSTEM = 4;
export const LOG_TYPE_ERROR = 5;
export const LOG_TYPE_REFUND = 6;

export function formatTimestamp(ts: number): string {
  if (!ts || ts <= 0) return "";
  return dayjs.unix(ts).format("MMM D, HH:mm:ss");
}

export function formatDateForInput(d: dayjs.Dayjs): string {
  return d.format("YYYY-MM-DDTHH:mm");
}

const modelColors = [
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "bg-green-500/15 text-green-700 dark:text-green-400",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "bg-red-500/15 text-red-700 dark:text-red-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
];

export function stringToColor(str: string): string {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return modelColors[sum % modelColors.length];
}

export function getLogTypeColor(type: number): string {
  switch (type) {
    case LOG_TYPE_TOPUP:
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-500";
    case LOG_TYPE_CONSUME:
      return "bg-green-500/10 text-green-700 dark:text-green-500";
    case LOG_TYPE_MANAGE:
      return "bg-orange-500/10 text-orange-700 dark:text-orange-500";
    case LOG_TYPE_SYSTEM:
      return "bg-purple-500/10 text-purple-700 dark:text-purple-500";
    case LOG_TYPE_ERROR:
      return "bg-red-500/10 text-red-700 dark:text-red-500";
    case LOG_TYPE_REFUND:
      return "bg-teal-500/10 text-teal-700 dark:text-teal-500";
    default:
      return "";
  }
}

export function getUseTimeColor(seconds: number): string {
  if (seconds < 10) return "text-green-500";
  if (seconds < 30) return "text-orange-500";
  return "text-red-500";
}

export function getFirstResponseTimeColor(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 3) return "text-green-500";
  if (seconds < 10) return "text-orange-500";
  return "text-red-500";
}

export function isConsumeLike(type: number): boolean {
  return (
    type === LOG_TYPE_CONSUME ||
    type === LOG_TYPE_ERROR ||
    type === LOG_TYPE_REFUND ||
    type === 0
  );
}

export interface ParsedOther {
  cache_tokens?: number;
  cache_creation_tokens?: number;
  frt?: number;
  request_path?: string;
  request_conversion?: string;
  billing?: string;
}

export function parseOther(
  other: string | null | undefined,
): ParsedOther | null {
  if (!other) return null;
  try {
    return JSON.parse(other);
  } catch {
    return null;
  }
}
