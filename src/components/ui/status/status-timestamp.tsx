"use client";

import { Icon } from "@/components/ui/icon";
import { dayjs } from "@/lib/utils/format/date";
import { useEffect, useState } from "react";

import type { HoverCardContentProps } from "@radix-ui/react-hover-card";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useStatusBlocksLabels } from "@/components/ui/status/status-i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/ui/use-media-query";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

type BaseProps = {
  date: Date;
  variant?: "simple" | "rich";
  className?: string;
};

type SimpleVariantProps = BaseProps &
  React.ComponentProps<typeof TooltipTrigger> & {
    variant?: "simple";
  };

type RichVariantProps = BaseProps &
  React.ComponentProps<typeof HoverCardTrigger> & {
    variant: "rich";
    side?: HoverCardContentProps["side"];
    align?: HoverCardContentProps["align"];
    alignOffset?: HoverCardContentProps["alignOffset"];
    sideOffset?: HoverCardContentProps["sideOffset"];
  };

type StatusTimestampProps = SimpleVariantProps | RichVariantProps;

export function StatusTimestamp(props: StatusTimestampProps) {
  const { date, variant = "simple", className, ...rest } = props;

  if (variant === "rich") {
    const {
      side = "right",
      align = "start",
      alignOffset = -4,
      sideOffset,
      children,
      onClick,
      ...triggerProps
    } = rest as Omit<RichVariantProps, "date" | "variant" | "className">;

    return (
      <RichTimestamp
        data-slot="status-timestamp"
        date={date}
        side={side}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={className}
        onClick={onClick}
        {...triggerProps}
      >
        {children}
      </RichTimestamp>
    );
  }

  const { children, ...triggerProps } = rest as Omit<
    SimpleVariantProps,
    "date" | "variant" | "className"
  >;

  return (
    <SimpleTimestamp
      data-slot="status-timestamp"
      date={date}
      className={className}
      {...triggerProps}
    >
      {children}
    </SimpleTimestamp>
  );
}
StatusTimestamp.displayName = "StatusTimestamp";

function SimpleTimestamp({
  date,
  className,
  children,
  ...props
}: Omit<SimpleVariantProps, "variant">) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "text-muted-foreground decoration-muted-foreground/30 font-mono underline decoration-dashed underline-offset-4",
            className,
          )}
          {...props}
        >
          {children || dayjs.utc(date).format("MMM DD, YYYY HH:mm [UTC]")}
        </TooltipTrigger>
        <TooltipContent data-slot="status-timestamp-content">
          <p className="font-mono">
            {dayjs(date).format("MMM DD, YYYY HH:mm")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
SimpleTimestamp.displayName = "SimpleTimestamp";

function RichTimestamp({
  date,
  side = "right",
  align = "start",
  alignOffset = -4,
  sideOffset,
  className,
  children,
  onClick,
  ...props
}: Omit<RichVariantProps, "variant">) {
  const labels = useStatusBlocksLabels();
  const [open, setOpen] = useState(false);
  const isTouch = useMediaQuery("(hover: none)");
  const [_, setRerender] = useState(0);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const relative = dayjs(date).fromNow();
  const formatted = dayjs(date).format("MMM DD, YYYY HH:mm:ss");
  const utc = dayjs.utc(date).format("MMM DD, YYYY HH:mm:ss");

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setRerender((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger
        className={className}
        onClick={(e) => {
          if (isTouch) setOpen((prev) => !prev);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        data-slot="status-timestamp-content"
        className="z-10 w-auto p-2"
        {...{ side, align, alignOffset, sideOffset }}
      >
        <dl className="flex flex-col gap-1">
          <StatusTimestampRow value={formatted} label={timezone} />
          <StatusTimestampRow value={utc} label="UTC" />
          <StatusTimestampRow
            value={relative}
            label={labels.timestampRelative}
          />
        </dl>
      </HoverCardContent>
    </HoverCard>
  );
}
RichTimestamp.displayName = "RichTimestamp";

function StatusTimestampRow({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const { copy, isCopied } = useCopyToClipboard();

  return (
    <div
      data-slot="status-timestamp-row"
      className="group flex items-center justify-between gap-4 text-sm"
      onClick={(e) => {
        e.stopPropagation();
        copy(value, { withToast: true });
      }}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1 truncate font-mono">
        <span className="invisible group-hover:visible">
          {!isCopied ? (
            <Icon name="copy" className="h-3 w-3" />
          ) : (
            <Icon name="check" className="h-3 w-3" />
          )}
        </span>
        {value}
      </dd>
    </div>
  );
}
StatusTimestampRow.displayName = "StatusTimestampRow";
