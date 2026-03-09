"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUsageLogsQuery, type LogFilters } from "@/hooks/logs-hook";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuCopy,
  LuFilter,
  LuRefreshCw,
  LuSearch,
  LuScrollText,
  LuX,
} from "react-icons/lu";
import { toast } from "sonner";

// Log type constants
const LOG_TYPE_ALL = -1;
const LOG_TYPE_TOPUP = 1;
const LOG_TYPE_CONSUME = 2;
const LOG_TYPE_MANAGE = 3;
const LOG_TYPE_SYSTEM = 4;
const LOG_TYPE_ERROR = 5;
const LOG_TYPE_REFUND = 6;

import { renderQuota } from "@/lib/config/constants";

function formatTimestamp(ts: number): string {
  if (!ts || ts <= 0) return "";
  const date = new Date(ts * 1000);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function LogRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-12" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-12" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-40" />
      </TableCell>
    </TableRow>
  );
}

export function UsageLogs() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Filter state
  const [logType, setLogType] = useState<number>(LOG_TYPE_ALL);
  const [tokenName, setTokenName] = useState("");
  const [modelName, setModelName] = useState("");
  const [requestId, setRequestId] = useState("");

  // Date range: default to today
  const today = new Date();
  const todayStr = formatDateForInput(today);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Build filters for the query
  const filters: LogFilters = {
    p: page,
    page_size: 20,
  };
  if (logType !== LOG_TYPE_ALL) {
    filters.type = logType;
  }
  if (startDate) {
    filters.start_timestamp = Math.floor(new Date(startDate).getTime() / 1000);
  }
  if (endDate) {
    // End of the end date
    filters.end_timestamp = Math.floor(
      new Date(endDate).getTime() / 1000 + 86400,
    );
  }
  if (tokenName) filters.token_name = tokenName;
  if (modelName) filters.model_name = modelName;
  if (requestId) filters.request_id = requestId;

  const logsQuery = useUsageLogsQuery(filters);

  const responseData = logsQuery.data as
    | {
        data?: {
          items?: any[];
          total?: number;
          page?: number;
          page_size?: number;
        };
      }
    | {
        items?: any[];
        total?: number;
        page?: number;
        page_size?: number;
      }
    | undefined;

  const pageData =
    responseData && "data" in responseData && responseData.data
      ? responseData.data
      : (responseData as
          | {
              items?: any[];
              total?: number;
              page?: number;
              page_size?: number;
            }
          | undefined);

  const logs = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const pageSize = pageData?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(t("LOGS.COPIED"));
  }

  function handleReset() {
    setLogType(LOG_TYPE_ALL);
    setTokenName("");
    setModelName("");
    setRequestId("");
    setStartDate(todayStr);
    setEndDate(todayStr);
    setPage(1);
  }

  const logTypeOptions = [
    { value: LOG_TYPE_ALL, label: t("LOGS.TYPE_ALL") },
    { value: LOG_TYPE_CONSUME, label: t("LOGS.TYPE_CONSUME") },
    { value: LOG_TYPE_TOPUP, label: t("LOGS.TYPE_TOPUP") },
    { value: LOG_TYPE_ERROR, label: t("LOGS.TYPE_ERROR") },
    { value: LOG_TYPE_SYSTEM, label: t("LOGS.TYPE_SYSTEM") },
    { value: LOG_TYPE_MANAGE, label: t("LOGS.TYPE_MANAGE") },
    { value: LOG_TYPE_REFUND, label: t("LOGS.TYPE_REFUND") },
  ];

  return (
    <div className="flex w-full flex-1 flex-col gap-0 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("LOGS.TITLE")}
            </span>
          </div>
          <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
            {t("LOGS.TITLE")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("LOGS.DESCRIPTION")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <LuFilter data-icon="inline-start" className="h-3.5 w-3.5" />
            {t("LOGS.FILTERS")}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => logsQuery.refetch()}
          >
            <LuRefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-border mb-4 border p-3">
        {/* Top row: date range + type */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="h-8 w-36 font-mono text-xs"
          />
          <span className="text-muted-foreground text-xs">{t("LOGS.TO")}</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="h-8 w-36 font-mono text-xs"
          />
          <Select
            value={logType.toString()}
            onValueChange={(v) => {
              setLogType(v !== null ? Number(v) : LOG_TYPE_ALL);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {logTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleReset}>
            {t("LOGS.RESET")}
          </Button>
        </div>

        {/* Expanded filters row */}
        {filtersExpanded && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder={t("LOGS.FILTER_TOKEN")}
                className="h-8 w-40 pl-7 font-mono text-xs"
              />
            </div>
            <div className="relative">
              <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={t("LOGS.FILTER_MODEL")}
                className="h-8 w-40 pl-7 font-mono text-xs"
              />
            </div>
            <div className="relative">
              <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                placeholder={t("LOGS.FILTER_REQUEST_ID")}
                className="h-8 w-48 pl-7 font-mono text-xs"
              />
            </div>
            {(tokenName || modelName || requestId) && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setTokenName("");
                  setModelName("");
                  setRequestId("");
                }}
              >
                <LuX className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border-border overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("LOGS.COL_TIME")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("LOGS.COL_TYPE")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("LOGS.COL_MODEL")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("LOGS.COL_TOKEN")}
              </TableHead>
              <TableHead className="text-muted-foreground text-right font-mono text-[10px] tracking-widest uppercase">
                {t("LOGS.COL_INPUT")}
              </TableHead>
              <TableHead className="text-muted-foreground text-right font-mono text-[10px] tracking-widest uppercase">
                {t("LOGS.COL_OUTPUT")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("LOGS.COL_TIME_FIRST")}
              </TableHead>
              <TableHead className="text-muted-foreground text-right font-mono text-[10px] tracking-widest uppercase">
                {t("LOGS.COL_SPEND")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("LOGS.COL_DETAILS")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsQuery.isLoading && (
              <>
                <LogRowSkeleton />
                <LogRowSkeleton />
                <LogRowSkeleton />
                <LogRowSkeleton />
                <LogRowSkeleton />
              </>
            )}

            {!logsQuery.isLoading && logs.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <LuScrollText className="text-muted-foreground h-8 w-8" />
                    <span className="text-muted-foreground text-sm">
                      {t("LOGS.NO_LOGS")}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {logs.map((log: any) => {
              const other = parseOther(log.other);
              const isConsumeLike =
                log.type === LOG_TYPE_CONSUME ||
                log.type === LOG_TYPE_ERROR ||
                log.type === LOG_TYPE_REFUND ||
                log.type === 0;
              const frt = other?.frt;

              // Cache info
              const cacheRead = other?.cache_tokens
                ? Number(other.cache_tokens)
                : 0;
              const cacheWrite = other?.cache_creation_tokens
                ? Number(other.cache_creation_tokens)
                : 0;

              return (
                <TableRow key={log.id}>
                  {/* Time */}
                  <TableCell>
                    <span className="text-muted-foreground font-mono text-xs">
                      {formatTimestamp(log.created_at)}
                    </span>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={getLogTypeColor(log.type)}
                    >
                      {logTypeOptions.find((o) => o.value === log.type)
                        ?.label ?? t("LOGS.TYPE_UNKNOWN")}
                    </Badge>
                  </TableCell>

                  {/* Model */}
                  <TableCell>
                    {isConsumeLike && log.model_name ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                className="cursor-pointer border-0 bg-transparent p-0"
                                onClick={() => handleCopy(log.model_name)}
                              />
                            }
                          >
                            <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                              {log.model_name}
                            </code>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("LOGS.CLICK_COPY")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {"\u2014"}
                      </span>
                    )}
                  </TableCell>

                  {/* Token */}
                  <TableCell>
                    {isConsumeLike && log.token_name ? (
                      <span className="text-muted-foreground text-xs">
                        {log.token_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {"\u2014"}
                      </span>
                    )}
                  </TableCell>

                  {/* Input tokens */}
                  <TableCell className="text-right">
                    {isConsumeLike ? (
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-xs tabular-nums">
                          {log.prompt_tokens?.toLocaleString() ?? 0}
                        </span>
                        {(cacheRead > 0 || cacheWrite > 0) && (
                          <span className="text-muted-foreground mt-0.5 text-[10px]">
                            {cacheRead > 0 &&
                              `${t("LOGS.CACHE_READ")} ${cacheRead.toLocaleString()}`}
                            {cacheRead > 0 && cacheWrite > 0 && " · "}
                            {cacheWrite > 0 &&
                              `${t("LOGS.CACHE_WRITE")} ${cacheWrite.toLocaleString()}`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {"\u2014"}
                      </span>
                    )}
                  </TableCell>

                  {/* Output tokens */}
                  <TableCell className="text-right">
                    {isConsumeLike && log.completion_tokens > 0 ? (
                      <span className="font-mono text-xs tabular-nums">
                        {log.completion_tokens.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {"\u2014"}
                      </span>
                    )}
                  </TableCell>

                  {/* Time / First response */}
                  <TableCell>
                    {(log.type === LOG_TYPE_CONSUME ||
                      log.type === LOG_TYPE_ERROR) &&
                    log.use_time ? (
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
                          {log.is_stream
                            ? t("LOGS.STREAM")
                            : t("LOGS.NON_STREAM")}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {"\u2014"}
                      </span>
                    )}
                  </TableCell>

                  {/* Spend */}
                  <TableCell className="text-right">
                    {isConsumeLike ? (
                      <span className="font-mono text-xs font-medium tabular-nums">
                        {renderQuota(log.quota, 6)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {"\u2014"}
                      </span>
                    )}
                  </TableCell>

                  {/* Details */}
                  <TableCell>
                    {log.content ? (
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
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {"\u2014"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-xs">
          {total} {t("LOGS.TOTAL")}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <LuChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground px-2 font-mono text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <LuChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
