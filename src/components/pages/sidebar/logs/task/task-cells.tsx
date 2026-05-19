"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  formatTaskDuration,
  formatTaskTimestamp,
  getTaskStatusColor,
  getTaskStatusKey,
  isAudioTask,
  isUrlLike,
  isVideoTaskAction,
  type TaskRow,
} from "./task-helpers";

const EMPTY = <span className="text-muted-foreground text-xs">{"—"}</span>;

export const TaskDialogContext = createContext<{
  openFailReason: (row: TaskRow) => void;
  openAudio: (row: TaskRow) => void;
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

export function TaskTimeCell({ row }: CellContext<TaskRow, unknown>) {
  const log = row.original;
  return (
    <StackedCell
      primary={
        <span className="font-mono text-xs">
          {formatTaskTimestamp(log.submit_time)}
        </span>
      }
      secondary={log.finish_time ? formatTaskTimestamp(log.finish_time) : null}
    />
  );
}

export function TaskChannelCell({ row }: CellContext<TaskRow, unknown>) {
  const log = row.original;
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

export function TaskIdCell({ row }: CellContext<TaskRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (!log.task_id) return EMPTY;
  const secondary =
    log.platform || log.action
      ? [log.platform, log.action].filter(Boolean).join(" · ")
      : null;
  return (
    <StackedCell
      primary={
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="border-border/60 bg-muted/30 inline-flex w-fit max-w-44 cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5"
                  onClick={() => {
                    copyToClipboard(log.task_id);
                    toast.success(t("LOGS.COPIED"));
                  }}
                />
              }
            >
              <span className="text-foreground truncate font-mono text-xs">
                {log.task_id}
              </span>
            </TooltipTrigger>
            <TooltipContent>{t("LOGS.CLICK_COPY")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      }
      secondary={secondary}
    />
  );
}

export function TaskDurationCell({ row }: CellContext<TaskRow, unknown>) {
  const log = row.original;
  const duration = formatTaskDuration(log.submit_time, log.finish_time);
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
      {duration.durationSec.toFixed(0)}s
    </span>
  );
}

export function TaskStatusCell({ row }: CellContext<TaskRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  if (!log.status) return EMPTY;
  const statusKey = getTaskStatusKey(log.status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] ${getTaskStatusColor(log.status)}`}
    >
      {statusKey ? t(statusKey) : log.status}
    </span>
  );
}

export function TaskProgressCell({ row }: CellContext<TaskRow, unknown>) {
  const log = row.original;
  if (!log.progress) return EMPTY;
  return (
    <span className="border-border/40 bg-muted/30 inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
      {log.progress}
    </span>
  );
}

export function TaskDetailsCell({ row }: CellContext<TaskRow, unknown>) {
  const t = useTranslations();
  const log = row.original;
  const ctx = useContext(TaskDialogContext);
  const status = log.status?.toUpperCase();

  if (status === "SUCCESS" && isAudioTask(log.platform)) {
    return (
      <button
        type="button"
        onClick={() => ctx?.openAudio(log)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <Icon name="music" className="size-3.5" />
        {t("LOGS.TASK.PLAY_AUDIO")}
      </button>
    );
  }

  if (
    status === "SUCCESS" &&
    isVideoTaskAction(log.action) &&
    isUrlLike(log.fail_reason)
  ) {
    return (
      <a
        href={log.fail_reason}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <Icon name="external-link" className="size-3.5" />
        {t("LOGS.TASK.OPEN_VIDEO")}
      </a>
    );
  }

  if (log.fail_reason) {
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

  return EMPTY;
}

export function TaskAudioPreviewDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  taskId?: string;
}) {
  const t = useTranslations();
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("LOGS.TASK.PLAY_AUDIO")}</DialogTitle>
        </DialogHeader>
        {props.url ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls src={props.url} className="w-full" />
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("LOGS.TASK.AUDIO_NOT_READY")}
          </p>
        )}
        {props.taskId && (
          <p className="text-muted-foreground font-mono text-[11px]">
            {props.taskId}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
