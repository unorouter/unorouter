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
  group?: string;
  cache_tokens?: number;
  cache_creation_tokens?: number;
  cache_creation_tokens_1h?: number;
  frt?: number;
  request_path?: string;
  // Upstream returns an ARRAY of conversion steps (e.g. ["OpenAI Compatible"]);
  // older rows may still carry a plain string.
  request_conversion?: string[] | string;
  billing?: string;
  billing_source?: "subscription" | "wallet" | string;
  billing_mode?: string;
  subscription_id?: number;
  subscription_plan_id?: number;
  subscription_plan_title?: string;
  subscription_pre_consumed?: number;
  subscription_final_consumed?: number;
  model_ratio?: number;
  completion_ratio?: number;
  cache_ratio?: number;
  cache_creation_ratio?: number;
  cache_creation_ratio_1h?: number;
  group_ratio?: number;
  user_group_ratio?: number;
  model_price?: number;
  matched_tier?: string;
  expr_b64?: string;
  reasoning_effort?: string;
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

// The group ratio actually applied to this request: a positive per-user override
// wins over the group default. Returns null when no meaningful discount applies.
export function getEffectiveGroupRatio(
  other: ParsedOther | null,
): number | null {
  if (!other) return null;
  const userOverride =
    other.user_group_ratio != null && other.user_group_ratio > 0
      ? other.user_group_ratio
      : null;
  const ratio = userOverride ?? other.group_ratio;
  if (ratio == null || ratio <= 0) return null;
  return ratio;
}

export interface LogPricing {
  inputPrice: number;
  outputPrice: number;
  effectiveInput: number;
  effectiveOutput: number;
  groupRatio: number | null;
  hasDiscount: boolean;
  isTiered: boolean;
}

// Derives per-1M input/output prices from the stored ratios so the pricing cell
// and the detail panel show identical numbers. Returns null when the row carries
// no usable model ratio (non-consume, or ratio missing).
export function computeLogPricing(
  other: ParsedOther | null,
): LogPricing | null {
  const modelRatio = other?.model_ratio;
  if (!other || !modelRatio || modelRatio <= 0) return null;
  const inputPrice = modelRatio * 2;
  const outputPrice = other.completion_ratio
    ? inputPrice * other.completion_ratio
    : inputPrice;
  const groupRatio = getEffectiveGroupRatio(other);
  const hasDiscount = groupRatio != null && groupRatio !== 1;
  return {
    inputPrice,
    outputPrice,
    effectiveInput: hasDiscount ? inputPrice * groupRatio : inputPrice,
    effectiveOutput: hasDiscount ? outputPrice * groupRatio : outputPrice,
    groupRatio,
    hasDiscount,
    isTiered: other.billing_mode === "tiered_expr",
  };
}

// Normalizes request_conversion (upstream sends an array; legacy rows a string)
// into a display chain. Returns [] when absent.
export function getRequestConversionChain(other: ParsedOther | null): string[] {
  const rc = other?.request_conversion;
  if (!rc) return [];
  if (Array.isArray(rc)) return rc.filter(Boolean);
  return [rc];
}

export type LogFilterValues = {
  start_date?: string;
  end_date?: string;
  log_type?: number;
  token_name?: string;
  model_name?: string;
  request_id?: string;
  upstream_request_id?: string;
  group?: string;
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
    ...(filterValues.upstream_request_id
      ? { upstream_request_id: filterValues.upstream_request_id }
      : {}),
    ...(filterValues.group ? { group: filterValues.group } : {}),
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
