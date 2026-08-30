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
import { usePricingVendorsQuery } from "@/hooks/models/pricing-hook";
import { analytics } from "@/lib/analytics";
import { renderQuota } from "@/lib/config/constants";
import type { TableFeats } from "@/lib/config/table-features";
import { copyToClipboard } from "@/lib/utils/base";
import { modelColorStyle } from "@/lib/utils/format/color";
import type { CellContext } from "@tanstack/react-table";
import { formatTimestamp } from "@/lib/utils/format/date";
import { formatPriceCompact } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { createContext, useContext } from "react";
import { toast } from "sonner";
import { StackedCell } from "./cell-primitives";
import {
  computeLogPricing,
  getClientAttribution,
  getEffectiveGroupRatio,
  getFrtTimingPill,
  getLogTypeColor,
  getResponseTimingPill,
  isConsumeLike,
  isFreeRow,
  LOG_TYPE_CONSUME,
  LOG_TYPE_ERROR,
  LOG_TYPE_MANAGE,
  LOG_TYPE_REFUND,
  LOG_TYPE_SYSTEM,
  LOG_TYPE_TOPUP,
  parseOther,
  type LogRow,
} from "./log-helpers";

const LOG_EMPTY = <span className="text-muted-foreground text-xs">{"-"}</span>;

export const LogDetailsContext = createContext<{
  open: (log: LogRow) => void;
} | null>(null);

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

export function LogTimeCell(props: CellContext<TableFeats, LogRow>) {
  return (
    <StackedCell
      primary={
        <span className="font-mono text-xs">
          {formatTimestamp(props.row.original.created_at)}
        </span>
      }
      secondary={<LogTypePill type={props.row.original.type} />}
    />
  );
}

export function LogUserCell(props: CellContext<TableFeats, LogRow>) {
  const log = props.row.original;
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

export function LogModelCell(props: CellContext<TableFeats, LogRow>) {
  const t = useTranslations();
  const vendorsQuery = usePricingVendorsQuery();
  const log = props.row.original;
  if (!isConsumeLike(log.type) || !log.model_name) {
    return LOG_EMPTY;
  }
  const vendorName =
    vendorsQuery.data?.model_vendors.find(
      (m) => m.model_name === log.model_name,
    )?.vendor ?? log.model_name;
  const other = parseOther(log.other);
  const mapped = other?.is_model_mapped
    ? other?.upstream_model_name
    : undefined;
  const upstream =
    mapped && mapped !== log.model_name.replace(/:free$/, "") ? mapped : null;

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
                toast.success(t("COMMON.COPIED_CLIPBOARD"));
              }}
            />
          }
        >
          <VendorIcon vendor={vendorName} size={14} />
          <span className="text-foreground font-mono text-xs">
            {log.model_name}
          </span>
        </TooltipTrigger>
        <TooltipContent>{t("LOGS.CLICK_COPY")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const channelBadge = log.channel ? (
    <code
      className="flex min-w-0 items-center gap-1 rounded px-1 py-0.5 font-mono text-[10px]"
      style={modelColorStyle(`#${log.channel}`)}
      title={log.channel_name ?? undefined}
    >
      <span className="shrink-0">{`#${log.channel}`}</span>
      {log.channel_name ? (
        <span className="truncate opacity-70">{log.channel_name}</span>
      ) : null}
    </code>
  ) : null;

  return (
    <StackedCell
      primary={primary}
      secondary={
        channelBadge || upstream ? (
          <span className="flex min-w-0 items-center gap-1.5">
            {channelBadge}
            {upstream ? (
              <span className="truncate">
                {t("LOGS.MAPPED_VIA", { upstream })}
              </span>
            ) : null}
          </span>
        ) : null
      }
    />
  );
}

export function LogTokenNameCell(props: CellContext<TableFeats, LogRow>) {
  const t = useTranslations();
  const log = props.row.original;
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
                toast.success(t("COMMON.COPIED_CLIPBOARD"));
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
  const other = parseOther(log.other);
  const groupRatio = getEffectiveGroupRatio(other);
  const groupText = log.group || other?.group || null;
  const secondary =
    groupText && groupRatio != null && groupRatio !== 1
      ? `${groupText} · ${groupRatio}x`
      : groupText;
  return <StackedCell primary={primary} secondary={secondary} />;
}

export function LogTokensCell(props: CellContext<TableFeats, LogRow>) {
  const t = useTranslations();
  const log = props.row.original;
  const isError = log.type === LOG_TYPE_ERROR;
  if (!isConsumeLike(log.type) && !isError) {
    return LOG_EMPTY;
  }
  const other = parseOther(log.other);
  const cacheRead = other?.cache_tokens ? Number(other.cache_tokens) : 0;
  const cacheWrite = other?.cache_creation_tokens
    ? Number(other.cache_creation_tokens)
    : 0;
  const prompt = log.prompt_tokens ?? 0;
  const completion = log.completion_tokens ?? 0;
  if (isError) {
    if (prompt <= 0) return LOG_EMPTY;
    return (
      <span className="font-mono text-xs font-medium tabular-nums">
        {prompt.toLocaleString()}
        <span className="text-muted-foreground"> {t("LOGS.TOKENS_IN")}</span>
      </span>
    );
  }
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

export function LogTimingCell(props: CellContext<TableFeats, LogRow>) {
  const t = useTranslations();
  const log = props.row.original;
  if (
    (log.type !== LOG_TYPE_CONSUME && log.type !== LOG_TYPE_ERROR) ||
    !log.use_time
  ) {
    return LOG_EMPTY;
  }
  const other = parseOther(log.other);
  const frt = other?.frt;
  const completion = log.completion_tokens ?? 0;

  const totalPill = getResponseTimingPill(log.use_time, completion);
  const showFirstToken = log.is_stream;
  const frtPill = frt && frt > 0 ? getFrtTimingPill(frt) : null;
  const firstTokenLabel =
    frt && frt > 0 ? `${(frt / 1000).toFixed(1)}s` : t("LOGS.NOT_AVAILABLE");

  return (
    <div className="flex items-stretch gap-2">
      <span
        aria-hidden
        className={`flex w-1 shrink-0 flex-col overflow-hidden rounded-full ${
          showFirstToken ? "" : totalPill.dot
        }`}
      >
        {showFirstToken && (
          <>
            <span className={`flex-1 ${frtPill?.dot ?? "bg-muted"}`} />
            <span className={`flex-1 ${totalPill.dot}`} />
          </>
        )}
      </span>
      <div className="flex min-w-0 flex-col justify-center gap-0.5 text-xs leading-tight">
        {showFirstToken && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground shrink-0">
              {t("LOGS.FIRST_TOKEN")}
            </span>
            <span className="tabular-nums">{firstTokenLabel}</span>
            {frt != null && frt < 0 && (
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
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground shrink-0">
            {t("LOGS.DURATION")}
          </span>
          <span className="tabular-nums">{log.use_time}s</span>
        </div>
      </div>
    </div>
  );
}

export function LogClientCell(props: CellContext<TableFeats, LogRow>) {
  const log = props.row.original;
  const client = getClientAttribution(parseOther(log.other));
  if (!client) return LOG_EMPTY;
  const detail = client.origin ?? client.referer;
  return (
    <div className="flex flex-col justify-center gap-0.5 text-xs leading-tight">
      <span className="text-foreground truncate font-medium">
        {client.label}
      </span>
      {detail && detail !== client.label && (
        <span className="text-muted-foreground/60 truncate">{detail}</span>
      )}
    </div>
  );
}

export function LogStreamCell(props: CellContext<TableFeats, LogRow>) {
  const t = useTranslations();
  const log = props.row.original;
  if (log.type !== LOG_TYPE_CONSUME && log.type !== LOG_TYPE_ERROR) {
    return LOG_EMPTY;
  }
  const completion = log.completion_tokens ?? 0;
  const tps =
    log.use_time > 0 && completion > 0 ? completion / log.use_time : null;

  return (
    <div className="flex flex-col justify-center gap-0.5 text-xs leading-tight">
      <span
        className={
          log.is_stream ? "text-info font-medium" : "text-muted-foreground"
        }
      >
        {log.is_stream ? t("LOGS.STREAM") : t("LOGS.NON_STREAM")}
      </span>
      <span className="text-muted-foreground/60 tabular-nums">
        {tps ? `${tps.toFixed(0)} t/s` : "\u2014"}
      </span>
    </div>
  );
}

function formatLogSpend(quota: number | undefined) {
  return quota ? renderQuota(quota, 6).replace(/^\$/, "") : "0";
}

export function LogSpendCell(props: CellContext<TableFeats, LogRow>) {
  const t = useTranslations();
  const log = props.row.original;
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
      <span className="flex items-center gap-1">
        <span className="border-border/80 bg-muted/60 inline-flex h-6 w-fit items-center gap-1 rounded-md border px-2 font-mono text-xs leading-none font-semibold tabular-nums">
          <span className="text-muted-foreground">{"$"}</span>
          {formatLogSpend(log.quota)}
        </span>
        {isFreeRow(log) && (
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
            {t("MODELS.TABLE.FREE")}
          </span>
        )}
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

export function LogPricingDetailsCell(props: CellContext<TableFeats, LogRow>) {
  const t = useTranslations();
  const log = props.row.original;
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

    const pricing = computeLogPricing(other);
    if (!pricing) {
      return LOG_EMPTY;
    }

    const inputPrice = pricing.inputPrice;
    const outputPrice = pricing.outputPrice;
    const hasDiscount = pricing.hasDiscount;
    const effectiveInput = pricing.effectiveInput;
    const effectiveOutput = pricing.effectiveOutput;
    const tierLabel = pricing.isTiered
      ? t("LOGS.PRICING.TIERED")
      : t("LOGS.PRICING.STANDARD");

    if (!pricing.isTiered && !hasDiscount && !inputPrice && !outputPrice) {
      return LOG_EMPTY;
    }

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

export function LogExpandToggleCell(props: CellContext<TableFeats, LogRow>) {
  if (!props.row.getCanExpand()) return null;
  return (
    <Icon
      name="chevron-right"
      className={`text-muted-foreground h-4 w-4 transition-transform ${props.row.getIsExpanded() ? "rotate-90" : ""}`}
    />
  );
}
