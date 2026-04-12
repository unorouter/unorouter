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

// Deterministic per-name color. Uses a djb2 hash mapped onto the HSL hue wheel
// so similar names (e.g. gpt-5.4 / gpt-5.4-mini / gpt-5.4-nano) land on clearly
// distinct hues. Returns inline style props for use on a badge element.
export function modelColorStyle(str: string): {
  backgroundColor: string;
  color: string;
} {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return {
    backgroundColor: `hsl(${hue} 85% 50% / 0.15)`,
    color: `hsl(${hue} 70% 40%)`,
  };
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
