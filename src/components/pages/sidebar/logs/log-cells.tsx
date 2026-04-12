"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { renderQuota } from "@/lib/config/constants";
import { copyToClipboard } from "@/lib/utils/base";
import type { CellContext } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { LuChevronRight, LuCircleAlert } from "react-icons/lu";
import { toast } from "sonner";
import {
  formatTimestamp,
  getFirstResponseTimeColor,
  getLogTypeColor,
  getUseTimeColor,
  isConsumeLike,
  LOG_TYPE_CONSUME,
  LOG_TYPE_ERROR,
  LOG_TYPE_MANAGE,
  LOG_TYPE_REFUND,
  LOG_TYPE_SYSTEM,
  LOG_TYPE_TOPUP,
  parseOther,
  modelColorStyle,
  type LogRow,
} from "./log-helpers";

const LOG_EMPTY = (
  <span className="text-muted-foreground text-xs">{"\u2014"}</span>
);

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
    [LOG_TYPE_TOPUP]: t("LOGS.ENUM.TOPUP"),
    [LOG_TYPE_CONSUME]: t("LOGS.ENUM.CONSUME"),
    [LOG_TYPE_MANAGE]: t("LOGS.ENUM.MANAGE"),
    [LOG_TYPE_SYSTEM]: t("LOGS.ENUM.SYSTEM"),
    [LOG_TYPE_ERROR]: t("LOGS.ENUM.ERROR"),
    [LOG_TYPE_REFUND]: t("LOGS.ENUM.REFUND"),
  };
  return (
    <Badge variant="secondary" className={getLogTypeColor(type)}>
      {labels[type] ?? t("LOGS.ENUM.UNKNOWN")}
    </Badge>
  );
}

export function LogModelCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (!isConsumeLike(log.type) || !log.model_name) {
    return LOG_EMPTY;
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
            className="rounded px-1.5 py-0.5 font-mono text-xs"
            style={modelColorStyle(log.model_name)}
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
    return LOG_EMPTY;
  }
  return (
    <span className="text-muted-foreground text-xs">{log.token_name}</span>
  );
}

export function LogInputTokensCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (!isConsumeLike(log.type)) {
    return LOG_EMPTY;
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
    return LOG_EMPTY;
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
    return LOG_EMPTY;
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
              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
              : "bg-purple-500/10 text-purple-700 dark:text-purple-400"
          }
        >
          {log.is_stream ? t("LOGS.STREAM") : t("LOGS.NON_STREAM")}
        </Badge>
        {frt != null && frt < 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="absolute -top-1 -right-1 cursor-help text-[10px] leading-none text-red-500">
                  <LuCircleAlert className="size-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={20}>
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
    return LOG_EMPTY;
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
    return LOG_EMPTY;
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
