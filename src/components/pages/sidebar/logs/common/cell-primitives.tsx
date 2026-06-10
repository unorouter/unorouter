"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copyToClipboard } from "@/lib/utils/base";
import { modelColorStyle } from "@/lib/utils/format/color";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export const EMPTY_CELL = (
  <span className="text-muted-foreground text-xs">{"-"}</span>
);

export function StackedCell(props: {
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

export function CopyIdButton(props: { id: string; maxWidth?: string }) {
  const t = useTranslations();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className={`border-border/60 bg-muted/30 inline-flex w-fit cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 ${props.maxWidth ?? "max-w-44"}`}
              onClick={() => {
                copyToClipboard(props.id);
                toast.success(t("LOGS.COPIED"));
              }}
            />
          }
        >
          <span className="text-foreground truncate font-mono text-xs">
            {props.id}
          </span>
        </TooltipTrigger>
        <TooltipContent>{t("LOGS.CLICK_COPY")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DurationBadge(props: {
  durationSec: number;
  isWarning: boolean;
  decimals: number;
}) {
  const variant = props.isWarning
    ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
    : "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400";
  const dot = props.isWarning ? "bg-red-500" : "bg-green-500";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${variant}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {props.durationSec.toFixed(props.decimals)}s
    </span>
  );
}

export function ChannelCode(props: { channelId: number | string }) {
  const label = `#${props.channelId}`;
  return (
    <code
      className="w-fit rounded px-1.5 py-0.5 font-mono text-xs"
      style={modelColorStyle(label)}
    >
      {label}
    </code>
  );
}
