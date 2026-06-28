"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  useFinalizeTaskMutation,
  useTaskStatusQuery,
} from "@/hooks/ai/chat-hook";
import { cn } from "@/lib/utils";
import { useAuiState } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type TaskPart = {
  taskId: string;
  status: string;
  progress: string;
  model: string;
  kind?: string;
};

type AnyPart = { type: string; [k: string]: unknown };

function buildTaskPart(source: Partial<TaskPart> | undefined): TaskPart | null {
  if (!source?.taskId || !source.model) return null;
  return {
    taskId: source.taskId,
    status: source.status ?? "SUBMITTED",
    progress: source.progress ?? "10%",
    model: source.model,
    ...(source.kind && { kind: source.kind }),
  };
}

// Illustrator image placeholder: the agent generates + amends this item asynchronously (no manual refresh,
// no server poll). Just show a "generating image" state until the rewrite replaces it with the inlay.
function ImagePlaceholder() {
  const t = useTranslations();
  return (
    <div className="bg-muted/40 text-muted-foreground flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
      <Icon name="loader" className="size-4 animate-spin" />
      <span>{t("CHAT.TASK.GENERATING_IMAGE")}</span>
    </div>
  );
}

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

function StatusIcon(props: { status: TaskStatus }) {
  if (props.status === "SUCCESS")
    return <Icon name="check" className="size-3" />;
  if (props.status === "FAILURE")
    return <Icon name="x-circle" className="size-3" />;
  if (IN_PROGRESS_STATUSES.has(props.status))
    return <Icon name="loader" className="size-3 animate-spin" />;
  return <Icon name="video" className="size-3" />;
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
      <Icon name="video" className="text-muted-foreground size-4 shrink-0" />

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
          <Icon
            name="refresh-cw"
            className={cn("size-3", isRunning && "animate-spin")}
          />
          {t("CHAT.TASK.REFRESH")}
        </Button>
      )}
    </div>
  );
}

// AI SDK delivers stream-side data-task parts as
// { type: "data", name: "task", data: {...} }; persisted task items are
// converted back to the same shape via itemsToParts.
export function TaskCardRenderer() {
  const convId = useAuiState((s) => s.threadListItem?.remoteId ?? "");
  const parts = useAuiState((s) => s.message.parts) as unknown as AnyPart[];
  const msgId = useAuiState((s) => s.message.id);

  const taskParts: TaskPart[] = [];
  for (const part of parts) {
    if (part.type === "data" && part.name === "task") {
      const built = buildTaskPart(part.data as Partial<TaskPart>);
      if (built) taskParts.push(built);
    }
  }

  if (taskParts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {taskParts.map((part) =>
        part.kind === "image" ? (
          <ImagePlaceholder key={part.taskId} />
        ) : (
          <TaskCard
            key={part.taskId}
            part={part}
            convId={convId}
            msgId={msgId}
          />
        ),
      )}
    </div>
  );
}
