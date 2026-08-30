"use client";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { CellContext } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
import { formatMsTimestamp as formatMjTimestamp } from "@/lib/utils/format/date";
import { parsePercent as parseProgress } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { createContext, useContext } from "react";
import {
  ChannelCode,
  CopyIdButton,
  DurationBadge,
  EMPTY_CELL as EMPTY,
  StackedCell,
} from "../common/cell-primitives";
import {
  formatMjDuration,
  getMjActionColor,
  getMjStatusColor,
  getMjStatusKey,
  type DrawingRow,
} from "./drawing-helpers";

export const DrawingDialogContext = createContext<{
  openImage: (row: DrawingRow) => void;
  openPrompt: (row: DrawingRow) => void;
  openFailReason: (row: DrawingRow) => void;
} | null>(null);

export function DrawingTimeCell(props: CellContext<TableFeats, DrawingRow>) {
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

export function DrawingMjIdCell(props: CellContext<TableFeats, DrawingRow>) {
  const log = props.row.original;
  if (!log.mj_id) return EMPTY;
  return <CopyIdButton id={log.mj_id} maxWidth="max-w-40" />;
}

export function DrawingActionCell(props: CellContext<TableFeats, DrawingRow>) {
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

export function DrawingDurationCell(
  props: CellContext<TableFeats, DrawingRow>,
) {
  const log = props.row.original;
  const duration = formatMjDuration(log.submit_time, log.finish_time);
  if (!duration) return EMPTY;
  return (
    <DurationBadge
      durationSec={duration.durationSec}
      isWarning={duration.isWarning}
      decimals={1}
    />
  );
}

export function DrawingProgressCell(
  props: CellContext<TableFeats, DrawingRow>,
) {
  const log = props.row.original;
  if (!log.progress) return EMPTY;
  const pct = parseProgress(log.progress);
  return (
    <span className="border-border/40 bg-muted/30 inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
      {pct}%
    </span>
  );
}

export function DrawingChannelCell(props: CellContext<TableFeats, DrawingRow>) {
  const log = props.row.original;
  if (!log.channel_id) return EMPTY;
  return <ChannelCode channelId={log.channel_id} />;
}

export function DrawingImageCell(props: CellContext<TableFeats, DrawingRow>) {
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

export function DrawingPromptCell(props: CellContext<TableFeats, DrawingRow>) {
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
  props: CellContext<TableFeats, DrawingRow>,
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
