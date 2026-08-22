"use client";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Badge } from "@/components/ui/badge";
import type { Row } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
import { useTranslations } from "next-intl";
import type React from "react";
import {
  computeLogPricing,
  formatPriceCompact,
  getClientAttribution,
  getRequestConversionChain,
  parseOther,
  type LogRow,
} from "./log-helpers";

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

function CopyableCode(props: { value: string; analyticsLabel: string }) {
  const t = useTranslations();
  return (
    <span className="flex items-center gap-1.5">
      <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs text-amber-700 dark:text-amber-400">
        {props.value}
      </code>
      <CopyButton
        text={props.value}
        iconSize="h-3 w-3"
        toastMessage={t("LOGS.COPIED")}
        analyticsLabel={props.analyticsLabel}
      />
    </span>
  );
}

export function LogExpandedRow(props: { row: Row<TableFeats, LogRow> }) {
  const t = useTranslations();
  const log = props.row.original;
  const other = parseOther(log.other);

  const items: { label: string; value: React.ReactNode }[] = [];

  if (log.channel && log.channel_name) {
    items.push({
      label: t("LOGS.DETAIL.CHANNEL"),
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
      label: t("LOGS.DETAIL.REQUEST_ID"),
      value: (
        <CopyableCode value={log.request_id} analyticsLabel="logs_request_id" />
      ),
    });
  }

  if (log.upstream_request_id) {
    items.push({
      label: t("LOGS.DETAIL.UPSTREAM_REQUEST_ID"),
      value: (
        <CopyableCode
          value={log.upstream_request_id}
          analyticsLabel="logs_upstream_request_id"
        />
      ),
    });
  }

  // Response time + first-response-time.
  if (log.use_time > 0) {
    const frtSeconds =
      other?.frt != null && other.frt > 0 ? other.frt / 1000 : null;
    items.push({
      label: t("LOGS.DETAIL.RESPONSE_TIME"),
      value: (
        <span className="flex items-center gap-2">
          <span>{log.use_time}s</span>
          {frtSeconds != null && (
            <span className="text-muted-foreground">
              {t("LOGS.DETAIL.FIRST_TOKEN")} {frtSeconds.toFixed(2)}s
            </span>
          )}
        </span>
      ),
    });
  }

  // Request conversion chain (array upstream) or Native format.
  if (other?.request_path) {
    items.push({
      label: t("LOGS.DETAIL.REQUEST_PATH"),
      value: (
        <code className="rounded bg-purple-500/10 px-1.5 py-0.5 font-mono text-xs text-purple-400">
          {other.request_path}
        </code>
      ),
    });
  }

  const client = getClientAttribution(other);
  const clientSource = client?.origin ?? client?.referer;
  if (client) {
    items.push({
      label: t("LOGS.DETAIL.CLIENT"),
      value: (
        <span className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-cyan-500/10 font-mono text-cyan-400"
          >
            {client.label}
          </Badge>
          {clientSource && clientSource !== client.label && (
            <span className="text-muted-foreground break-all">
              {clientSource}
            </span>
          )}
        </span>
      ),
    });
    if (client.userAgent) {
      items.push({
        label: t("LOGS.DETAIL.USER_AGENT"),
        value: (
          <span className="text-muted-foreground break-all">
            {client.userAgent}
          </span>
        ),
      });
    }
  }

  const conversionChain = getRequestConversionChain(other);
  if (conversionChain.length > 0) {
    items.push({
      label: t("LOGS.DETAIL.REQUEST_CONVERSION"),
      value: (
        <Badge
          variant="secondary"
          className="bg-indigo-500/10 font-mono text-indigo-400"
        >
          {conversionChain.length <= 1
            ? t("LOGS.DETAIL.NATIVE_FORMAT")
            : conversionChain.join(" -> ")}
        </Badge>
      ),
    });
  }

  // Model mapping.
  if (other?.is_model_mapped && other.upstream_model_name) {
    items.push({
      label: t("LOGS.DETAIL.MODEL_MAPPING"),
      value: (
        <span className="flex items-center gap-1.5">
          <span>{log.model_name}</span>
          <span className="text-muted-foreground">{"->"}</span>
          <span className="text-foreground">{other.upstream_model_name}</span>
        </span>
      ),
    });
  }

  // Tokens & caching view.
  const cacheRead = other?.cache_tokens ? Number(other.cache_tokens) : 0;
  const cacheWrite = other?.cache_creation_tokens
    ? Number(other.cache_creation_tokens)
    : 0;
  const cacheWrite1h = other?.cache_creation_tokens_1h
    ? Number(other.cache_creation_tokens_1h)
    : 0;
  if (
    log.prompt_tokens > 0 ||
    log.completion_tokens > 0 ||
    cacheRead > 0 ||
    cacheWrite > 0
  ) {
    items.push({
      label: t("LOGS.DETAIL.TOKENS"),
      value: (
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="bg-muted font-mono text-[10px]">
            {t("LOGS.DETAIL.INPUT")} {log.prompt_tokens.toLocaleString()}
          </Badge>
          <Badge variant="secondary" className="bg-muted font-mono text-[10px]">
            {t("LOGS.DETAIL.OUTPUT")} {log.completion_tokens.toLocaleString()}
          </Badge>
          {cacheRead > 0 && (
            <Badge
              variant="secondary"
              className="bg-cyan-500/10 font-mono text-[10px] text-cyan-400"
            >
              {t("LOGS.DETAIL.CACHE_READ")} {cacheRead.toLocaleString()}
            </Badge>
          )}
          {cacheWrite > 0 && (
            <Badge
              variant="secondary"
              className="bg-teal-500/10 font-mono text-[10px] text-teal-400"
            >
              {t("LOGS.DETAIL.CACHE_WRITE")} {cacheWrite.toLocaleString()}
            </Badge>
          )}
          {cacheWrite1h > 0 && (
            <Badge
              variant="secondary"
              className="bg-teal-500/10 font-mono text-[10px] text-teal-400"
            >
              {t("LOGS.DETAIL.CACHE_WRITE_1H")} {cacheWrite1h.toLocaleString()}
            </Badge>
          )}
        </span>
      ),
    });
  }

  // Billing / pricing breakdown.
  const pricing = computeLogPricing(other);
  if (pricing) {
    items.push({
      label: t("LOGS.DETAIL.PRICING"),
      value: (
        <span className="flex flex-col gap-0.5">
          <span>
            {formatPriceCompact(pricing.effectiveInput)} /{" "}
            {formatPriceCompact(pricing.effectiveOutput)}
            <span className="text-muted-foreground">
              {t("LOGS.PRICING.PER_M")}
            </span>
            <span className="text-muted-foreground">
              {" · "}
              {pricing.isTiered
                ? t("LOGS.PRICING.TIERED")
                : t("LOGS.PRICING.STANDARD")}
            </span>
          </span>
          {pricing.hasDiscount && pricing.groupRatio != null && (
            <span className="text-muted-foreground">
              {t("LOGS.DETAIL.GROUP_RATIO")} {pricing.groupRatio}x
            </span>
          )}
        </span>
      ),
    });
  }

  if (other?.billing_source) {
    const isUpstream = other.billing === "upstream";
    items.push({
      label: t("LOGS.DETAIL.BILLING_SOURCE"),
      value: (
        <Badge
          variant="secondary"
          className={
            isUpstream
              ? "bg-green-500/10 font-mono text-green-400"
              : "bg-orange-500/10 font-mono text-orange-400"
          }
        >
          {isUpstream
            ? t("LOGS.DETAIL.BILLING_UPSTREAM")
            : t("LOGS.DETAIL.BILLING_LOCAL")}
        </Badge>
      ),
    });
  }

  if (other?.reasoning_effort) {
    items.push({
      label: t("LOGS.DETAIL.REASONING_EFFORT"),
      value: (
        <Badge
          variant="secondary"
          className="bg-violet-500/10 font-mono text-violet-400"
        >
          {other.reasoning_effort}
        </Badge>
      ),
    });
  }

  if (log.content) {
    items.push({
      label: t("LOGS.DETAIL.LOG_DETAILS"),
      value: (
        <span className="font-mono text-xs whitespace-pre-wrap text-orange-300/80">
          {log.content}
        </span>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="border-border/50 divide-border/50 bg-muted/10 flex flex-col divide-y px-6 py-4">
      {items.map((item) => (
        <DetailItem key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
