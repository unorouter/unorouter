"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { renderQuota } from "@/lib/config/constants";
import type { ResponseDtoPageDataModelLogDataItemsItem } from "@/openapi";
import type { CellContext } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { LuCopy, LuScrollText } from "react-icons/lu";
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
  return d.format("YYYY-MM-DD");
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

function parseOther(
  other: string | null | undefined,
): Record<string, any> | null {
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
                navigator.clipboard.writeText(log.model_name);
                toast.success(t("LOGS.COPIED"));
              }}
            />
          }
        >
          <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
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
        <span className="text-muted-foreground mt-0.5 text-[10px]">
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
      {log.is_stream && frt ? (
        <span
          className={`font-mono text-xs tabular-nums ${getFirstResponseTimeColor(frt)}`}
        >
          {(frt / 1000).toFixed(1)}s
        </span>
      ) : null}
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
            <span className="text-muted-foreground block max-w-[200px] cursor-default truncate text-xs" />
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

export function LogEmptyState() {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-3">
      <LuScrollText className="text-muted-foreground h-8 w-8" />
      <span className="text-muted-foreground text-sm">
        {t("LOGS.NO_LOGS")}
      </span>
    </div>
  );
}
