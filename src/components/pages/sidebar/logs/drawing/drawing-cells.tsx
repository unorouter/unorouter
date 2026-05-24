"use client";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copyToClipboard } from "@/lib/utils/base";
import { modelColorStyle } from "@/lib/utils/format/color";
import type { CellContext } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { createContext, useContext } from "react";
import { toast } from "sonner";
import {
  formatMjDuration,
  formatMjTimestamp,
  getMjActionColor,
  getMjStatusColor,
  getMjStatusKey,
  parseProgress,
  type DrawingRow,
} from "./drawing-helpers";

const EMPTY = <span className="text-muted-foreground text-xs">{"-"}</span>;

export const DrawingDialogContext = createContext<{
  openImage: (row: DrawingRow) => void;
  openPrompt: (row: DrawingRow) => void;
  openFailReason: (row: DrawingRow) => void;
} | null>(null);

function StackedCell(props: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
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

export function DrawingTimeCell(props: CellContext<DrawingRow, unknown>) {
  const t = useTranslations();
  const log = props.row.original;
  const statusColor = getMjStatusColor(log.status);
  const statusKey = getMjStatusKey(log.status);
  const statusLabel = statusKey ? t(statusKey) : (log.status ?? "-");
  return (
    <StackedCell
      primary={
        <span className="font-mono text-xs">
          {formatMjTimestamp(log.submit_time)}
        </span>
      }
      secondary={
        <span
          className={`inline-flex items-center gap-1 rounded px-1 text-[10px] ${statusColor}`}
        >
          {statusLabel}
        </span>
      }
    />
  );
}

export function DrawingMjIdCell(props: CellContext<DrawingRow, unknown>) {
  const t = useTranslations();
  const log = props.row.original;
  if (!log.mj_id) return EMPTY;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="border-border/60 bg-muted/30 inline-flex w-fit max-w-40 cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5"
              onClick={() => {
                copyToClipboard(log.mj_id);
                toast.success(t("LOGS.COPIED"));
              }}
            />
          }
        >
          <span className="text-foreground truncate font-mono text-xs">
            {log.mj_id}
          </span>
        </TooltipTrigger>
        <TooltipContent>{t("LOGS.CLICK_COPY")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DrawingActionCell(props: CellContext<DrawingRow, unknown>) {
  const log = props.row.original;
  if (!log.action) return EMPTY;
  return (
    <Badge
      variant="secondary"
      className={`font-mono text-[10px] ${getMjActionColor(log.action)}`}
    >
      {log.action}
    </Badge>
  );
}

export function DrawingDurationCell(props: CellContext<DrawingRow, unknown>) {
  const log = props.row.original;
  const duration = formatMjDuration(log.submit_time, log.finish_time);
  if (!duration) return EMPTY;
  const variant = duration.isWarning
    ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
    : "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400";
  const dot = duration.isWarning ? "bg-red-500" : "bg-green-500";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${variant}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {duration.durationSec.toFixed(1)}s
    </span>
  );
}

export function DrawingProgressCell(props: CellContext<DrawingRow, unknown>) {
  const log = props.row.original;
  if (!log.progress) return EMPTY;
  const pct = parseProgress(log.progress);
  return (
    <span className="border-border/40 bg-muted/30 inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
      {pct}%
    </span>
  );
}

export function DrawingChannelCell(props: CellContext<DrawingRow, unknown>) {
  const log = props.row.original;
  if (!log.channel_id) return EMPTY;
  const label = `#${log.channel_id}`;
  return (
    <code
      className="w-fit rounded px-1.5 py-0.5 font-mono text-xs"
      style={modelColorStyle(label)}
    >
      {label}
    </code>
  );
}

export function DrawingImageCell(props: CellContext<DrawingRow, unknown>) {
  const t = useTranslations();
  const log = props.row.original;
  const ctx = useContext(DrawingDialogContext);
  if (!log.image_url && !log.video_url) return EMPTY;
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      onClick={() => ctx?.openImage(log)}
    >
      <Icon name="image" className="size-3.5" />
      {t("LOGS.DRAWING.VIEW")}
    </button>
  );
}

export function DrawingPromptCell(props: CellContext<DrawingRow, unknown>) {
  const log = props.row.original;
  const ctx = useContext(DrawingDialogContext);
  if (!log.prompt) return EMPTY;
  return (
    <button
      type="button"
      onClick={() => ctx?.openPrompt(log)}
      className="hover:text-foreground text-muted-foreground block max-w-56 truncate text-left text-xs underline-offset-4 hover:underline"
    >
      {log.prompt}
    </button>
  );
}

export function DrawingFailReasonCell(
  props: CellContext<DrawingRow, unknown>,
) {
  const log = props.row.original;
  const ctx = useContext(DrawingDialogContext);
  if (!log.fail_reason) return EMPTY;
  return (
    <button
      type="button"
      onClick={() => ctx?.openFailReason(log)}
      className="block max-w-56 truncate text-left text-xs text-red-500 underline-offset-4 hover:underline"
    >
      {log.fail_reason}
    </button>
  );
}
