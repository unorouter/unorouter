"use client";

import { CopyButton } from "@/components/elements/code/copy-button";
import type { LogFilterValues } from "@/components/pages/sidebar/logs/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { renderQuota } from "@/lib/config/constants";
import { copyToClipboard } from "@/lib/utils/base";
import type { ResponseDtoPageDataModelLogDataItemsItem } from "@/openapi";
import type { CellContext, Row } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import type React from "react";
import { useState } from "react";
import {
  LuChevronRight,
  LuCircleAlert,
  LuFilter,
  LuScrollText,
  LuSearch,
  LuX,
} from "react-icons/lu";
import { toast } from "sonner";

export type LogRow = NonNullable<ResponseDtoPageDataModelLogDataItemsItem>;

// Log type constants
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
  "bg-amber-500/15 text-amber-400",
  "bg-blue-500/15 text-blue-400",
  "bg-cyan-500/15 text-cyan-400",
  "bg-green-500/15 text-green-400",
  "bg-indigo-500/15 text-indigo-400",
  "bg-sky-500/15 text-sky-400",
  "bg-lime-500/15 text-lime-400",
  "bg-orange-500/15 text-orange-400",
  "bg-pink-500/15 text-pink-400",
  "bg-purple-500/15 text-purple-400",
  "bg-red-500/15 text-red-400",
  "bg-teal-500/15 text-teal-400",
  "bg-violet-500/15 text-violet-400",
  "bg-yellow-500/15 text-yellow-400",
  "bg-rose-500/15 text-rose-400",
];

function stringToColor(str: string): string {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return modelColors[sum % modelColors.length];
}

function getLogTypeColor(type: number): string {
  switch (type) {
    case LOG_TYPE_TOPUP:
      return "bg-cyan-500/10 text-cyan-500";
    case LOG_TYPE_CONSUME:
      return "bg-green-500/10 text-green-500";
    case LOG_TYPE_MANAGE:
      return "bg-orange-500/10 text-orange-500";
    case LOG_TYPE_SYSTEM:
      return "bg-purple-500/10 text-purple-500";
    case LOG_TYPE_ERROR:
      return "bg-red-500/10 text-red-500";
    case LOG_TYPE_REFUND:
      return "bg-teal-500/10 text-teal-500";
    default:
      return "";
  }
}

function getUseTimeColor(seconds: number): string {
  if (seconds < 10) return "text-green-500";
  if (seconds < 30) return "text-orange-500";
  return "text-red-500";
}

function getFirstResponseTimeColor(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 3) return "text-green-500";
  if (seconds < 10) return "text-orange-500";
  return "text-red-500";
}

function isConsumeLike(type: number): boolean {
  return (
    type === LOG_TYPE_CONSUME ||
    type === LOG_TYPE_ERROR ||
    type === LOG_TYPE_REFUND ||
    type === 0
  );
}

interface ParsedOther {
  cache_tokens?: number;
  cache_creation_tokens?: number;
  frt?: number;
  request_path?: string;
  request_conversion?: string;
  billing?: string;
}

function parseOther(other: string | null | undefined): ParsedOther | null {
  if (!other) return null;
  try {
    return JSON.parse(other);
  } catch {
    return null;
  }
}

export function LogTimeCell({ row }: CellContext<LogRow, unknown>) {
  return (
    <span className="text-muted-foreground font-mono text-xs">
      {formatTimestamp(row.original.created_at)}
    </span>
  );
}

export function LogTypeCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const type = row.original.type;
  const labels: Record<number, string> = {
    [LOG_TYPE_TOPUP]: t("LOGS.TYPE_TOPUP"),
    [LOG_TYPE_CONSUME]: t("LOGS.TYPE_CONSUME"),
    [LOG_TYPE_MANAGE]: t("LOGS.TYPE_MANAGE"),
    [LOG_TYPE_SYSTEM]: t("LOGS.TYPE_SYSTEM"),
    [LOG_TYPE_ERROR]: t("LOGS.TYPE_ERROR"),
    [LOG_TYPE_REFUND]: t("LOGS.TYPE_REFUND"),
  };
  return (
    <Badge variant="secondary" className={getLogTypeColor(type)}>
      {labels[type] ?? t("LOGS.TYPE_UNKNOWN")}
    </Badge>
  );
}

export function LogModelCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (!isConsumeLike(log.type) || !log.model_name) {
    return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0"
              onClick={() => {
                copyToClipboard(log.model_name);
                toast.success(t("LOGS.COPIED"));
              }}
            />
          }
        >
          <code
            className={`rounded px-1.5 py-0.5 font-mono text-xs ${stringToColor(log.model_name)}`}
          >
            {log.model_name}
          </code>
        </TooltipTrigger>
        <TooltipContent>{t("LOGS.CLICK_COPY")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LogTokenNameCell({ row }: CellContext<LogRow, unknown>) {
  const log = row.original;
  if (!isConsumeLike(log.type) || !log.token_name) {
    return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
  }
  return (
    <span className="text-muted-foreground text-xs">{log.token_name}</span>
  );
}

export function LogInputTokensCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (!isConsumeLike(log.type)) {
    return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
  }
  const other = parseOther(log.other);
  const cacheRead = other?.cache_tokens ? Number(other.cache_tokens) : 0;
  const cacheWrite = other?.cache_creation_tokens
    ? Number(other.cache_creation_tokens)
    : 0;
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-xs tabular-nums">
        {log.prompt_tokens?.toLocaleString() ?? 0}
      </span>
      {(cacheRead > 0 || cacheWrite > 0) && (
        <span className="text-muted-foreground mt-0.5 text-[10px] whitespace-nowrap">
          {cacheRead > 0 &&
            `${t("LOGS.CACHE_READ")} ${cacheRead.toLocaleString()}`}
          {cacheRead > 0 && cacheWrite > 0 && " \u00b7 "}
          {cacheWrite > 0 &&
            `${t("LOGS.CACHE_WRITE")} ${cacheWrite.toLocaleString()}`}
        </span>
      )}
    </div>
  );
}

export function LogOutputTokensCell({ row }: CellContext<LogRow, unknown>) {
  const log = row.original;
  if (!isConsumeLike(log.type) || log.completion_tokens <= 0) {
    return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
  }
  return (
    <span className="font-mono text-xs tabular-nums">
      {log.completion_tokens.toLocaleString()}
    </span>
  );
}

export function LogTimingCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (
    (log.type !== LOG_TYPE_CONSUME && log.type !== LOG_TYPE_ERROR) ||
    !log.use_time
  ) {
    return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
  }
  const other = parseOther(log.other);
  const frt = other?.frt;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`font-mono text-xs tabular-nums ${getUseTimeColor(log.use_time)}`}
      >
        {log.use_time}s
      </span>
      {log.is_stream && frt && frt > 0 ? (
        <span
          className={`font-mono text-xs tabular-nums ${getFirstResponseTimeColor(frt)}`}
        >
          {(frt / 1000).toFixed(1)}s
        </span>
      ) : null}
      <span className="relative inline-block">
        <Badge
          variant="secondary"
          className={
            log.is_stream
              ? "bg-blue-500/10 text-blue-400"
              : "bg-purple-500/10 text-purple-400"
          }
        >
          {log.is_stream ? t("LOGS.STREAM") : t("LOGS.NON_STREAM")}
        </Badge>
        {frt != null && frt < 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="absolute -top-1 -right-1 cursor-help text-[10px] leading-none text-red-500">
                  <LuCircleAlert className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t("LOGS.STREAM_ERROR")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
    </div>
  );
}

export function LogSpendCell({ row }: CellContext<LogRow, unknown>) {
  const log = row.original;
  if (!isConsumeLike(log.type)) {
    return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
  }
  return (
    <span className="font-mono text-xs font-medium tabular-nums">
      {renderQuota(log.quota, 6)}
    </span>
  );
}

export function LogDetailsCell({ row }: CellContext<LogRow, unknown>) {
  const log = row.original;
  if (!log.content) {
    return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="text-muted-foreground block max-w-50 cursor-default truncate text-xs" />
          }
        >
          {log.content}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-wrap">
          {log.content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LogExpandToggleCell({ row }: CellContext<LogRow, unknown>) {
  if (!row.getCanExpand()) return null;
  return (
    <LuChevronRight
      className={`text-muted-foreground h-4 w-4 transition-transform ${row.getIsExpanded() ? "rotate-90" : ""}`}
    />
  );
}

export function canLogRowExpand(row: Row<LogRow>): boolean {
  return isConsumeLike(row.original.type);
}

function DetailItem(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-1.5">
      <span className="text-muted-foreground w-44 shrink-0 text-right text-xs">
        {props.label}
      </span>
      <span className="text-foreground font-mono text-xs">{props.value}</span>
    </div>
  );
}

export function LogExpandedRow(props: { row: Row<LogRow> }) {
  const t = useTranslations();
  const log = props.row.original;
  const other = parseOther(log.other);

  const items: { label: string; value: React.ReactNode }[] = [];

  if (log.channel && log.channel_name) {
    items.push({
      label: t("LOGS.EXPAND_CHANNEL"),
      value: (
        <Badge
          variant="secondary"
          className="bg-blue-500/10 font-mono text-blue-400"
        >
          {log.channel} &ndash; {log.channel_name}
        </Badge>
      ),
    });
  }

  if (log.request_id) {
    items.push({
      label: t("LOGS.EXPAND_REQUEST_ID"),
      value: (
        <span className="flex items-center gap-1.5">
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs text-amber-400">
            {log.request_id}
          </code>
          <CopyButton
            text={log.request_id ?? ""}
            iconSize="h-3 w-3"
            toastMessage={t("LOGS.COPIED")}
          />
        </span>
      ),
    });
  }

  const cacheRead = other?.cache_tokens ? Number(other.cache_tokens) : 0;
  const cacheWrite = other?.cache_creation_tokens
    ? Number(other.cache_creation_tokens)
    : 0;

  if (cacheRead > 0) {
    items.push({
      label: t("LOGS.EXPAND_CACHE_TOKENS"),
      value: (
        <Badge
          variant="secondary"
          className="bg-cyan-500/10 font-mono text-cyan-400"
        >
          {cacheRead.toLocaleString()}
        </Badge>
      ),
    });
  }

  if (cacheWrite > 0) {
    items.push({
      label: t("LOGS.EXPAND_CACHE_CREATION"),
      value: (
        <Badge
          variant="secondary"
          className="bg-teal-500/10 font-mono text-teal-400"
        >
          {cacheWrite.toLocaleString()}
        </Badge>
      ),
    });
  }

  if (log.content) {
    items.push({
      label: t("LOGS.EXPAND_LOG_DETAILS"),
      value: (
        <span className="font-mono text-xs whitespace-pre-wrap text-orange-300/80">
          {log.content}
        </span>
      ),
    });
  }

  if (other?.request_path) {
    items.push({
      label: t("LOGS.EXPAND_REQUEST_PATH"),
      value: (
        <code className="rounded bg-purple-500/10 px-1.5 py-0.5 font-mono text-xs text-purple-400">
          {other.request_path}
        </code>
      ),
    });
  }

  if (other?.request_conversion) {
    items.push({
      label: t("LOGS.EXPAND_REQUEST_CONVERSION"),
      value: (
        <Badge
          variant="secondary"
          className="bg-indigo-500/10 font-mono text-indigo-400"
        >
          {other.request_conversion}
        </Badge>
      ),
    });
  }

  if (other?.billing) {
    items.push({
      label: t("LOGS.EXPAND_BILLING_MODE"),
      value: (
        <Badge
          variant="secondary"
          className={
            other.billing === "upstream"
              ? "bg-green-500/10 font-mono text-green-400"
              : "bg-orange-500/10 font-mono text-orange-400"
          }
        >
          {other.billing === "upstream"
            ? t("LOGS.EXPAND_BILLING_UPSTREAM")
            : t("LOGS.EXPAND_BILLING_LOCAL")}
        </Badge>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="border-border/50 divide-border/50 flex flex-col divide-y px-6 py-2">
      {items.map((item) => (
        <DetailItem key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

export function LogEmptyState() {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-3">
      <LuScrollText className="text-muted-foreground h-8 w-8" />
      <span className="text-muted-foreground text-sm">{t("LOGS.NO_LOGS")}</span>
    </div>
  );
}

export function LogFilters(props: {
  filters: LogFilterValues;
  onFilterChange: (id: string, value: unknown) => void;
  onReset: () => void;
  onRefresh: () => void;
}) {
  const t = useTranslations();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const startOfDay = formatDateForInput(dayjs().startOf("day"));
  const endOfDay = formatDateForInput(dayjs().endOf("day"));
  const startDate = props.filters.start_date ?? startOfDay;
  const endDate = props.filters.end_date ?? endOfDay;
  const logType = props.filters.log_type;
  const tokenName = props.filters.token_name ?? "";
  const modelName = props.filters.model_name ?? "";
  const requestId = props.filters.request_id ?? "";

  const logTypeOptions = [
    { value: "all", label: t("LOGS.TYPE_ALL") },
    { value: String(LOG_TYPE_CONSUME), label: t("LOGS.TYPE_CONSUME") },
    { value: String(LOG_TYPE_TOPUP), label: t("LOGS.TYPE_TOPUP") },
    { value: String(LOG_TYPE_ERROR), label: t("LOGS.TYPE_ERROR") },
    { value: String(LOG_TYPE_SYSTEM), label: t("LOGS.TYPE_SYSTEM") },
    { value: String(LOG_TYPE_MANAGE), label: t("LOGS.TYPE_MANAGE") },
    { value: String(LOG_TYPE_REFUND), label: t("LOGS.TYPE_REFUND") },
  ];

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <DateTimeRangePicker
          value={{
            from: dayjs(startDate).toDate(),
            to: dayjs(endDate).toDate(),
          }}
          onChange={(range) => {
            props.onFilterChange(
              "start_date",
              formatDateForInput(dayjs(range.from)),
            );
            props.onFilterChange(
              "end_date",
              formatDateForInput(dayjs(range.to)),
            );
          }}
        />
        <Select
          value={logType != null ? String(logType) : "all"}
          onValueChange={(v) => {
            props.onFilterChange(
              "log_type",
              v === "all" ? undefined : Number(v),
            );
          }}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue>
              {logTypeOptions.find(
                (o) => o.value === (logType != null ? String(logType) : "all"),
              )?.label ?? t("LOGS.TYPE_ALL")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {logTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={props.onReset}>
          {t("LOGS.RESET")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <LuFilter data-icon="inline-start" className="h-3.5 w-3.5" />
          {t("LOGS.FILTERS")}
        </Button>
      </div>

      {filtersExpanded && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={tokenName}
              onChange={(e) =>
                props.onFilterChange("token_name", e.target.value || undefined)
              }
              placeholder={t("LOGS.FILTER_TOKEN")}
              className="h-8 w-40 pl-7 font-mono text-xs"
            />
          </div>
          <div className="relative">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={modelName}
              onChange={(e) =>
                props.onFilterChange("model_name", e.target.value || undefined)
              }
              placeholder={t("LOGS.FILTER_MODEL")}
              className="h-8 w-40 pl-7 font-mono text-xs"
            />
          </div>
          <div className="relative">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={requestId}
              onChange={(e) =>
                props.onFilterChange("request_id", e.target.value || undefined)
              }
              placeholder={t("LOGS.FILTER_REQUEST_ID")}
              className="h-8 w-48 pl-7 font-mono text-xs"
            />
          </div>
          {(tokenName || modelName || requestId) && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                props.onFilterChange("token_name", undefined);
                props.onFilterChange("model_name", undefined);
                props.onFilterChange("request_id", undefined);
              }}
            >
              <LuX className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
