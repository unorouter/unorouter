"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  useFinalizeTaskMutation,
  useTaskStatusQuery,
} from "@/hooks/ai/chat-hook";
import { cn } from "@/lib/utils";
import { patchLiveMessages } from "@/store/chat-store";
import { useAuiState } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

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

type MediaKind = "video" | "image" | "audio";

// The video-task flow also serves async image models (e.g. AI Horde). Pick the
// card icon from the task kind when known, else infer from the model name.
function taskMediaKind(part: TaskPart): MediaKind {
  if (part.kind === "image" || part.kind === "video" || part.kind === "audio") {
    return part.kind;
  }
  const model = part.model.toLowerCase();
  if (/i2v|t2v|r2v|kf2v|\bvideo\b|sora|veo|kling|wan|happyhorse/.test(model)) {
    return "video";
  }
  return "image";
}

const KIND_ICON: Record<MediaKind, string> = {
  video: "video",
  image: "image",
  audio: "music",
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

function StatusIcon(props: { status: TaskStatus; kind: MediaKind }) {
  if (props.status === "SUCCESS")
    return <Icon name="check" className="size-3" />;
  if (props.status === "FAILURE")
    return <Icon name="x-circle" className="size-3" />;
  if (IN_PROGRESS_STATUSES.has(props.status))
    return <Icon name="loader" className="size-3 animate-spin" />;
  return <Icon name={KIND_ICON[props.kind]} className="size-3" />;
}

const POLL_INTERVAL_MS = 4000;

export function TaskCard(props: Props) {
  const t = useTranslations();
  const [localStatus, setLocalStatus] = useState(props.part.status);
  const [localProgress, setLocalProgress] = useState(props.part.progress);
  const finalizedRef = useRef(false);

  const effectiveStatus = localStatus;
  const isTerminal = TERMINAL_STATUSES.has(effectiveStatus);

  // Poll while not FAILURE. A finalized SUCCESS unmounts this card (its item is
  // rewritten to a video), so a card still rendering as SUCCESS means finalize
  // never ran (e.g. status flipped to SUCCESS before the result URL was ready,
  // or a reload) - keep polling so it fetches the URL and finalizes.
  const needsPoll = effectiveStatus !== "FAILURE";
  const statusQuery = useTaskStatusQuery(
    props.part.taskId,
    true,
    needsPoll ? POLL_INTERVAL_MS : false,
  );
  const finalizeMutation = useFinalizeTaskMutation();

  const effectiveProgress = statusQuery.data?.progress ?? localProgress;
  const failReason = statusQuery.data?.failReason;
  const isRunning = statusQuery.isFetching || finalizeMutation.isPending;

  const data = statusQuery.data;
  useEffect(() => {
    if (!data) return;
    setLocalStatus(data.status);
    setLocalProgress(data.progress);
    if (
      data.status === "SUCCESS" &&
      data.resultUrl &&
      !finalizedRef.current &&
      !finalizeMutation.isPending
    ) {
      finalizedRef.current = true;
      finalizeMutation.mutate(
        {
          convId: props.convId,
          msgId: props.msgId,
          taskId: props.part.taskId,
          resultUrl: data.resultUrl,
        },
        {
          onSuccess: (result) => {
            // Patch the live thread so the finished media replaces the task card
            // without a reload (the DB write + query invalidate alone don't
            // re-render the assistant-ui runtime's in-memory messages).
            const alt = result.kind === "image" ? "image" : "video";
            const newPart = {
              type: "text",
              text: `![${alt}](${result.url})`,
            };
            const isTaskPart = (p: { type: string; name?: unknown }) =>
              p.type === "data-task" ||
              (p.type === "data" && p.name === "task");
            patchLiveMessages((msgs) => {
              const list = msgs as Array<{
                id: string;
                parts?: Array<{
                  type: string;
                  name?: unknown;
                  [k: string]: unknown;
                }>;
                [k: string]: unknown;
              }>;
              return list.map((m) =>
                m.id === props.msgId
                  ? {
                      ...m,
                      parts: (m.parts ?? [])
                        .filter((p) => !isTaskPart(p))
                        .concat(newPart),
                    }
                  : m,
              );
            });
          },
        },
      );
    }
  }, [data]);

  const handleRefresh = async () => {
    await statusQuery.refetch();
  };

  const kind = taskMediaKind(props.part);

  return (
    <div className="bg-muted/40 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
      <Icon
        name={KIND_ICON[kind]}
        className="text-muted-foreground size-4 shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(effectiveStatus)}>
            <StatusIcon status={effectiveStatus} kind={kind} />
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
        {effectiveStatus === "FAILURE" && failReason && (
          <span className="text-destructive text-xs wrap-break-word">
            {failReason}
          </span>
        )}
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
