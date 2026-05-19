import { dayjs } from "@/lib/utils/format/date";
import type { GetLogsStatParams, GetUserLogsParams, Log } from "@/openapi";
import { columnFilters as getColumnFilterValues } from "@/store/data-table-store";
import type { ColumnFiltersState } from "@tanstack/react-table";
export { formatDateForInput, formatTimestamp } from "@/lib/utils/format/date";
export { formatPriceCompact } from "@/lib/utils/format/number";

export type LogRow = NonNullable<Log>;

export const LOG_TYPE_TOPUP = 1;
export const LOG_TYPE_CONSUME = 2;
export const LOG_TYPE_MANAGE = 3;
export const LOG_TYPE_SYSTEM = 4;
export const LOG_TYPE_ERROR = 5;
export const LOG_TYPE_REFUND = 6;

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

export function getThroughputColor(tokensPerSecond: number): string {
  if (tokensPerSecond >= 30) return "text-green-500";
  if (tokensPerSecond >= 15) return "text-orange-500";
  return "text-red-500";
}

export function getResponseTimeColor(
  seconds: number,
  completionTokens: number,
): string {
  if (completionTokens < 100 || seconds <= 0) return getUseTimeColor(seconds);
  return getThroughputColor(completionTokens / seconds);
}

type TimingVariant = "success" | "warning" | "danger";

function timingVariantFromSeconds(seconds: number): TimingVariant {
  if (seconds < 10) return "success";
  if (seconds < 30) return "warning";
  return "danger";
}

function timingVariantFromThroughput(tokensPerSecond: number): TimingVariant {
  if (tokensPerSecond >= 30) return "success";
  if (tokensPerSecond >= 15) return "warning";
  return "danger";
}

function timingVariantFromFrt(seconds: number): TimingVariant {
  if (seconds < 5) return "success";
  if (seconds < 10) return "warning";
  return "danger";
}

const TIMING_PILL_CLASSES: Record<TimingVariant, string> = {
  success:
    "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
  warning:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

const TIMING_PILL_DOTS: Record<TimingVariant, string> = {
  success: "bg-green-500",
  warning: "bg-orange-500",
  danger: "bg-red-500",
};

export function getResponseTimingPill(
  seconds: number,
  completionTokens: number,
): { container: string; dot: string } {
  const variant: TimingVariant =
    completionTokens < 100 || seconds <= 0
      ? timingVariantFromSeconds(seconds)
      : timingVariantFromThroughput(completionTokens / seconds);
  return {
    container: TIMING_PILL_CLASSES[variant],
    dot: TIMING_PILL_DOTS[variant],
  };
}

export function getFrtTimingPill(ms: number): {
  container: string;
  dot: string;
} {
  const variant = timingVariantFromFrt(ms / 1000);
  return {
    container: TIMING_PILL_CLASSES[variant],
    dot: TIMING_PILL_DOTS[variant],
  };
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
  billing_source?: "subscription" | "wallet" | string;
  subscription_id?: number;
  subscription_plan_id?: number;
  subscription_plan_title?: string;
  model_ratio?: number;
  completion_ratio?: number;
  cache_ratio?: number;
  cache_creation_ratio?: number;
  cache_creation_ratio_1h?: number;
  group_ratio?: number;
  user_group_ratio?: number;
  billing_mode?: string;
  matched_tier?: string;
  expr_b64?: string;
  is_model_mapped?: boolean;
  upstream_model_name?: string;
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

export type LogFilterValues = {
  start_date?: string;
  end_date?: string;
  log_type?: number;
  token_name?: string;
  model_name?: string;
  request_id?: string;
  subscription_plan?: string;
};

export function buildLogQueryFilters(
  columnFilters: ColumnFiltersState,
  pagination: { pageIndex: number; pageSize: number },
) {
  const filterValues =
    getColumnFilterValues<LogFilterValues>(columnFilters) ?? {};

  const startDate =
    filterValues.start_date ??
    dayjs().startOf("day").format("YYYY-MM-DDTHH:mm");
  const endDate =
    filterValues.end_date ?? dayjs().endOf("day").format("YYYY-MM-DDTHH:mm");

  const queryFilters: GetUserLogsParams = {
    p: pagination.pageIndex + 1,
    page_size: pagination.pageSize,
    ...(filterValues.log_type != null ? { type: filterValues.log_type } : {}),
    ...(startDate ? { start_timestamp: dayjs(startDate).unix() } : {}),
    ...(endDate ? { end_timestamp: dayjs(endDate).unix() } : {}),
    ...(filterValues.token_name ? { token_name: filterValues.token_name } : {}),
    ...(filterValues.model_name ? { model_name: filterValues.model_name } : {}),
    ...(filterValues.request_id ? { request_id: filterValues.request_id } : {}),
    ...(filterValues.subscription_plan
      ? { subscription_plan: filterValues.subscription_plan }
      : {}),
  };

  const statFilters: GetLogsStatParams = {
    ...(filterValues.log_type != null ? { type: filterValues.log_type } : {}),
    ...(startDate ? { start_timestamp: dayjs(startDate).unix() } : {}),
    ...(endDate ? { end_timestamp: dayjs(endDate).unix() } : {}),
    ...(filterValues.token_name ? { token_name: filterValues.token_name } : {}),
    ...(filterValues.model_name ? { model_name: filterValues.model_name } : {}),
  };

  return { filterValues, queryFilters, statFilters };
}
