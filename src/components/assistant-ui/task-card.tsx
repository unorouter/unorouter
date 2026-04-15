"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFinalizeTaskMutation, useTaskStatusQuery } from "@/hooks/chat-hook";
import { cn } from "@/lib/utils";
import { useAuiState } from "@assistant-ui/react";
import {
  CheckIcon,
  LoaderIcon,
  RefreshCwIcon,
  VideoIcon,
  XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type TaskPart = {
  type: "task";
  taskId: string;
  status: string;
  progress: string;
  model: string;
};

type Props = {
  part: TaskPart;
  convId: string;
  msgId: string;
};

type TaskStatus = TaskPart["status"];

const TERMINAL_STATUSES = new Set<TaskStatus>(["SUCCESS", "FAILURE"]);
const IN_PROGRESS_STATUSES = new Set<TaskStatus>([
  "NOT_START",
  "SUBMITTED",
  "QUEUED",
  "IN_PROGRESS",
]);

function statusVariant(
  status: TaskStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "SUCCESS") return "default";
  if (status === "FAILURE") return "destructive";
  if (IN_PROGRESS_STATUSES.has(status)) return "secondary";
  return "outline";
}

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === "SUCCESS") return <CheckIcon className="size-3" />;
  if (status === "FAILURE") return <XCircleIcon className="size-3" />;
  if (IN_PROGRESS_STATUSES.has(status))
    return <LoaderIcon className="size-3 animate-spin" />;
  return <VideoIcon className="size-3" />;
}

export function TaskCard(props: Props) {
  const t = useTranslations();
  const [queryEnabled, setQueryEnabled] = useState(false);
  const [localStatus, setLocalStatus] = useState(props.part.status);
  const [localProgress, setLocalProgress] = useState(props.part.progress);

  const statusQuery = useTaskStatusQuery(props.part.taskId, queryEnabled);
  const finalizeMutation = useFinalizeTaskMutation();

  const effectiveStatus = statusQuery.data?.status ?? localStatus;
  const effectiveProgress = statusQuery.data?.progress ?? localProgress;
  const isTerminal = TERMINAL_STATUSES.has(effectiveStatus);
  const isRunning = statusQuery.isFetching || finalizeMutation.isPending;

  const handleRefresh = async () => {
    setQueryEnabled(true);
    const result = await statusQuery.refetch();
    const data = result.data;
    if (!data) return;

    setLocalStatus(data.status);
    setLocalProgress(data.progress);

    if (data.status === "SUCCESS" && data.resultUrl) {
      await finalizeMutation.mutateAsync({
        convId: props.convId,
        msgId: props.msgId,
        taskId: props.part.taskId,
        resultUrl: data.resultUrl,
      });
    }
  };

  return (
    <div className="bg-muted/40 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
      <VideoIcon className="text-muted-foreground size-4 shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(effectiveStatus)}>
            <StatusIcon status={effectiveStatus} />
            <span>
              {effectiveStatus === "SUCCESS"
                ? t("CHAT.TASK.STATUS_SUCCESS")
                : effectiveStatus === "FAILURE"
                  ? t("CHAT.TASK.STATUS_FAILURE")
                  : effectiveStatus === "IN_PROGRESS"
                    ? t("CHAT.TASK.STATUS_IN_PROGRESS")
                    : effectiveStatus === "QUEUED"
                      ? t("CHAT.TASK.STATUS_QUEUED")
                      : t("CHAT.TASK.STATUS_SUBMITTED")}
            </span>
          </Badge>
          {!isTerminal && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {effectiveProgress}
            </span>
          )}
        </div>
        <span className="text-muted-foreground truncate text-xs">
          {props.part.model}
        </span>
      </div>

      {!isTerminal && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 gap-1.5 text-xs"
          disabled={isRunning}
          onClick={handleRefresh}
        >
          <RefreshCwIcon
            className={cn("size-3", isRunning && "animate-spin")}
          />
          {t("CHAT.TASK.REFRESH")}
        </Button>
      )}
    </div>
  );
}

/** Reads task parts from the assistant-ui runtime and renders a TaskCard for each. */
export function TaskCardRenderer() {
  const convId = useAuiState((s) => s.threadListItem?.remoteId ?? "");
  const parts = useAuiState((s) => s.message.parts) as unknown as TaskPart[];
  const msgId = useAuiState((s) => s.message.id);

  const taskParts = parts.filter((p) => p.type === "task");

  if (taskParts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {taskParts.map((part) => (
        <TaskCard key={part.taskId} part={part} convId={convId} msgId={msgId} />
      ))}
    </div>
  );
}
