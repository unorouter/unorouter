"use client";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Badge } from "@/components/ui/badge";
import type { Row } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import type React from "react";
import { parseOther, type LogRow } from "./log-helpers";

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
        <span className="flex items-center gap-1.5">
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs text-amber-400">
            {log.request_id}
          </code>
          <CopyButton
            text={log.request_id ?? ""}
            iconSize="h-3 w-3"
            toastMessage={t("LOGS.COPIED")}
            analyticsLabel="logs_request_id"
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
      label: t("LOGS.DETAIL.CACHE_TOKENS"),
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
      label: t("LOGS.DETAIL.CACHE_CREATION"),
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
      label: t("LOGS.DETAIL.LOG_DETAILS"),
      value: (
        <span className="font-mono text-xs whitespace-pre-wrap text-orange-300/80">
          {log.content}
        </span>
      ),
    });
  }

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

  if (other?.request_conversion) {
    items.push({
      label: t("LOGS.DETAIL.REQUEST_CONVERSION"),
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
      label: t("LOGS.DETAIL.BILLING_MODE"),
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
            ? t("LOGS.DETAIL.BILLING_UPSTREAM")
            : t("LOGS.DETAIL.BILLING_LOCAL")}
        </Badge>
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
