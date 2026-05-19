"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { analytics } from "@/lib/analytics";
import { renderQuota } from "@/lib/config/constants";
import { copyToClipboard, modelColorStyle } from "@/lib/utils/base";
import type { CellContext } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { createContext, useContext, type ReactNode } from "react";
import { toast } from "sonner";
import {
  formatPriceCompact,
  formatTimestamp,
  getFrtTimingPill,
  getLogTypeColor,
  getResponseTimingPill,
  isConsumeLike,
  LOG_TYPE_CONSUME,
  LOG_TYPE_ERROR,
  LOG_TYPE_MANAGE,
  LOG_TYPE_REFUND,
  LOG_TYPE_SYSTEM,
  LOG_TYPE_TOPUP,
  parseOther,
  type LogRow,
} from "./log-helpers";

const LOG_EMPTY = (
  <span className="text-muted-foreground text-xs">{"\u2014"}</span>
);

export const LogDetailsContext = createContext<{
  open: (log: LogRow) => void;
} | null>(null);

function StackedCell(props: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      {props.primary}
      {props.secondary != null && props.secondary !== "" && (
        <span className="text-muted-foreground/70 truncate text-[10px]">
          {props.secondary}
        </span>
      )}
    </div>
  );
}

function LogTypePill(props: { type: number }) {
  const t = useTranslations();
  const labels: Record<number, string> = {
    [LOG_TYPE_TOPUP]: t("LOGS.ENUM.TOPUP"),
    [LOG_TYPE_CONSUME]: t("LOGS.ENUM.CONSUME"),
    [LOG_TYPE_MANAGE]: t("LOGS.ENUM.MANAGE"),
    [LOG_TYPE_SYSTEM]: t("LOGS.ENUM.SYSTEM"),
    [LOG_TYPE_ERROR]: t("LOGS.ENUM.ERROR"),
    [LOG_TYPE_REFUND]: t("LOGS.ENUM.REFUND"),
  };
  const color = getLogTypeColor(props.type);
  const dotClass =
    {
      [LOG_TYPE_TOPUP]: "bg-cyan-500",
      [LOG_TYPE_CONSUME]: "bg-green-500",
      [LOG_TYPE_MANAGE]: "bg-orange-500",
      [LOG_TYPE_SYSTEM]: "bg-purple-500",
      [LOG_TYPE_ERROR]: "bg-red-500",
      [LOG_TYPE_REFUND]: "bg-teal-500",
    }[props.type] ?? "bg-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${color}`}>
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      {labels[props.type] ?? t("LOGS.ENUM.UNKNOWN")}
    </span>
  );
}

export function LogTimeCell({ row }: CellContext<LogRow, unknown>) {
  return (
    <StackedCell
      primary={
        <span className="font-mono text-xs">
          {formatTimestamp(row.original.created_at)}
        </span>
      }
      secondary={<LogTypePill type={row.original.type} />}
    />
  );
}

export function LogChannelCell({ row }: CellContext<LogRow, unknown>) {
  const log = row.original;
  if (!log.channel) {
    return LOG_EMPTY;
  }
  const channelLabel = `#${log.channel}`;
  const name = log.channel_name;
  return (
    <StackedCell
      primary={
        <code
          className="w-fit rounded px-1.5 py-0.5 font-mono text-xs"
          style={modelColorStyle(channelLabel)}
        >
          {channelLabel}
        </code>
      }
      secondary={
        name ? (
          <span className="block max-w-40 truncate" title={name}>
            {name}
          </span>
        ) : null
      }
    />
  );
}

export function LogUserCell({ row }: CellContext<LogRow, unknown>) {
  const log = row.original;
  if (!log.username) {
    return LOG_EMPTY;
  }
  const initial = log.username.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm" style={modelColorStyle(log.username)}>
        <AvatarFallback className="bg-transparent text-[10px] font-medium text-current">
          {initial || <Icon name="user" className="size-3" />}
        </AvatarFallback>
      </Avatar>
      <span className="text-foreground truncate text-xs">{log.username}</span>
    </div>
  );
}

export function LogModelCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (!isConsumeLike(log.type) || !log.model_name) {
    return LOG_EMPTY;
  }
  const other = parseOther(log.other);
  const upstream = other?.is_model_mapped ? other?.upstream_model_name : null;

  const primary = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="border-border/60 bg-muted/30 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border px-1.5 py-0.5"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(log.model_name);
                analytics.logs.modelNameCopied();
                toast.success(t("LOGS.COPIED"));
              }}
            />
          }
        >
          <VendorIcon vendor={log.model_name} size={14} />
          <span className="text-foreground font-mono text-xs">
            {log.model_name}
          </span>
        </TooltipTrigger>
        <TooltipContent>{t("LOGS.CLICK_COPY")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <StackedCell
      primary={primary}
      secondary={
        upstream ? t("LOGS.MAPPED_VIA", { upstream: upstream as string }) : null
      }
    />
  );
}

export function LogTokenNameCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (!isConsumeLike(log.type) || !log.token_name) {
    return LOG_EMPTY;
  }
  const primary = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="inline-flex w-fit cursor-pointer items-center gap-1 border-0 bg-transparent p-0"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(log.token_name);
                analytics.logs.tokenNameCopied();
                toast.success(t("LOGS.COPIED"));
              }}
            />
          }
        >
          <span className="border-border/60 bg-muted/30 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
            <Icon name="key-round" className="text-muted-foreground size-3" />
            <span className="text-foreground font-mono text-xs">
              {log.token_name}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{t("LOGS.CLICK_COPY")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  return <StackedCell primary={primary} secondary={log.group || null} />;
}

export function LogTokensCell({ row }: CellContext<LogRow, unknown>) {
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
  const prompt = log.prompt_tokens ?? 0;
  const completion = log.completion_tokens ?? 0;
  const cacheParts: string[] = [];
  if (cacheRead > 0) {
    cacheParts.push(`${t("LOGS.CACHE_READ")} ${cacheRead.toLocaleString()}`);
  }
  if (cacheWrite > 0) {
    cacheParts.push(`${t("LOGS.CACHE_WRITE")} ${cacheWrite.toLocaleString()}`);
  }
  return (
    <StackedCell
      primary={
        <span className="font-mono text-xs font-medium tabular-nums">
          {prompt.toLocaleString()}
          <span className="text-muted-foreground"> / </span>
          {completion.toLocaleString()}
        </span>
      }
      secondary={cacheParts.length > 0 ? cacheParts.join(" \u00b7 ") : null}
    />
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
  const completion = log.completion_tokens ?? 0;
  const tokensPerSecond =
    log.use_time > 0 && completion > 0 ? completion / log.use_time : 0;
  const streamLabel = log.is_stream ? t("LOGS.STREAM") : t("LOGS.NON_STREAM");
  const secondary =
    tokensPerSecond > 0
      ? `${streamLabel} \u00b7 ${tokensPerSecond.toFixed(0)} t/s`
      : streamLabel;

  const totalPill = getResponseTimingPill(log.use_time, completion);
  const frtPill =
    log.is_stream && frt && frt > 0 ? getFrtTimingPill(frt) : null;

  const primary = (
    <div className="flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${totalPill.container}`}
      >
        <span className={`size-1.5 rounded-full ${totalPill.dot}`} />
        {log.use_time}s
      </span>
      {frtPill && frt ? (
        <span
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${frtPill.container}`}
        >
          {(frt / 1000).toFixed(1)}s
        </span>
      ) : null}
      {log.is_stream && frt != null && frt < 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className="cursor-help text-red-500">
                <Icon name="circle-alert" className="size-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              <p className="text-xs">{t("LOGS.STREAM_ERROR")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  return <StackedCell primary={primary} secondary={secondary} />;
}

export function LogSpendCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (!isConsumeLike(log.type)) {
    return LOG_EMPTY;
  }
  const other = parseOther(log.other);
  const isSubscription = other?.billing_source === "subscription";
  const planTitle = other?.subscription_plan_title;
  const planId = other?.subscription_plan_id;
  const subId = other?.subscription_id;
  const planLabel = planTitle || (planId ? `#${planId}` : "");

  if (!isSubscription) {
    return (
      <span className="font-mono text-xs font-medium tabular-nums">
        {renderQuota(log.quota, 6)}
      </span>
    );
  }

  const stack = (
    <div className="flex flex-col items-start gap-0.5">
      <Badge
        variant="secondary"
        className="bg-emerald-500/10 px-1.5 py-0 font-mono text-[10px] text-emerald-700 dark:text-emerald-400"
      >
        {t("LOGS.SUBSCRIPTION")}
      </Badge>
      {planLabel && (
        <Badge
          variant="secondary"
          className="bg-blue-500/10 px-1.5 py-0 font-mono text-[10px] text-blue-700 dark:text-blue-400"
        >
          {planLabel}
        </Badge>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<div className="cursor-default" />}>
          {stack}
        </TooltipTrigger>
        <TooltipContent>
          {t("LOGS.SUBSCRIPTION_DEDUCTION")}
          {planLabel ? `: ${planLabel}` : ""}
          {subId ? ` (#${subId})` : ""}
          {log.quota ? ` \u00b7 ${renderQuota(log.quota, 6)}` : ""}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LogPricingDetailsCell({ row }: CellContext<LogRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  const other = parseOther(log.other);
  const ctx = useContext(LogDetailsContext);

  function trigger() {
    if (ctx) ctx.open(log);
  }

  const inner = (() => {
    if (log.type === LOG_TYPE_ERROR && log.content) {
      return (
        <span className="text-muted-foreground block max-w-50 truncate text-xs">
          {log.content}
        </span>
      );
    }
    if (!isConsumeLike(log.type)) {
      return (
        <span className="text-muted-foreground block max-w-50 truncate text-xs">
          {log.content || ""}
        </span>
      );
    }

    const modelRatio = other?.model_ratio;
    const completionRatio = other?.completion_ratio;

    if (!modelRatio || modelRatio <= 0) {
      return (
        <span className="text-muted-foreground block max-w-50 truncate text-xs">
          {log.content || ""}
        </span>
      );
    }

    const inputPrice = modelRatio * 2;
    const outputPrice = completionRatio
      ? inputPrice * completionRatio
      : inputPrice;
    const tierLabel =
      other?.billing_mode === "tiered_expr"
        ? t("LOGS.PRICING.TIERED")
        : t("LOGS.PRICING.STANDARD");

    const userOverride =
      other?.user_group_ratio != null && other.user_group_ratio > 0
        ? other.user_group_ratio
        : null;
    const groupRatio = userOverride ?? other?.group_ratio;
    const hasDiscount =
      groupRatio != null && groupRatio > 0 && groupRatio !== 1;
    const effectiveInput = hasDiscount ? inputPrice * groupRatio : inputPrice;
    const effectiveOutput = hasDiscount
      ? outputPrice * groupRatio
      : outputPrice;

    return (
      <span className="flex flex-col gap-0.5 font-mono text-[11px] leading-tight">
        <span>
          <span className="text-muted-foreground">{tierLabel}</span>
          <span className="text-muted-foreground">{" \u00b7 "}</span>
          <span
            className={
              hasDiscount
                ? "text-muted-foreground/70 line-through"
                : "text-foreground"
            }
          >
            {formatPriceCompact(inputPrice)} / {formatPriceCompact(outputPrice)}
          </span>
          {!hasDiscount && (
            <span className="text-muted-foreground">
              {t("LOGS.PRICING.PER_M")}
            </span>
          )}
        </span>
        {hasDiscount && (
          <span>
            <span className="text-foreground">
              {formatPriceCompact(effectiveInput)} /{" "}
              {formatPriceCompact(effectiveOutput)}
            </span>
            <span className="text-muted-foreground">
              {t("LOGS.PRICING.PER_M")}
            </span>
          </span>
        )}
      </span>
    );
  })();

  if (!isConsumeLike(log.type) && log.type !== LOG_TYPE_ERROR && !log.content) {
    return LOG_EMPTY;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        trigger();
      }}
      className="hover:text-foreground cursor-pointer text-left underline-offset-4 hover:underline"
    >
      {inner}
    </button>
  );
}

export function LogExpandToggleCell({ row }: CellContext<LogRow, unknown>) {
  if (!row.getCanExpand()) return null;
  return (
    <Icon
      name="chevron-right"
      className={`text-muted-foreground h-4 w-4 transition-transform ${row.getIsExpanded() ? "rotate-90" : ""}`}
    />
  );
}
