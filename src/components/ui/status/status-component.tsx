"use client";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useStatusBlocksLabels } from "@/components/ui/status/status-i18n";
import { StatusIcon as UnifiedStatusIcon } from "@/components/ui/status/status-icon";
import type {
  StatusBarData,
  StatusType,
} from "@/components/ui/status/status.types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/ui/use-media-query";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/utils/format/date";
import { useState } from "react";

interface StatusComponentProps extends React.ComponentProps<"div"> {
  variant: Exclude<StatusType, "empty">;
}

export function StatusComponent({
  variant,
  className,
  children,
  ...props
}: StatusComponentProps) {
  return (
    <div
      data-slot="status-component"
      data-variant={variant}
      className={cn("group/component space-y-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
StatusComponent.displayName = "StatusComponent";

export function StatusComponentHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-component-header"
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
StatusComponentHeader.displayName = "StatusComponentHeader";

export function StatusComponentHeaderLeft({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-component-header-left"
      className={cn("flex min-w-0 flex-1 items-center gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
StatusComponentHeaderLeft.displayName = "StatusComponentHeaderLeft";

export function StatusComponentHeaderRight({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-component-header-right"
      className={cn("flex shrink-0 items-center gap-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}
StatusComponentHeaderRight.displayName = "StatusComponentHeaderRight";

export function StatusComponentBody({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-component-body"
      className={cn("space-y-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
StatusComponentBody.displayName = "StatusComponentBody";

export function StatusComponentTitle({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-component-title"
      className={cn(
        "text-foreground truncate font-mono text-base leading-5 font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
StatusComponentTitle.displayName = "StatusComponentTitle";

export function StatusComponentDescription({
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof TooltipTrigger>) {
  const isTouch = useMediaQuery("(hover: none)");
  const [open, setOpen] = useState(false);

  if (!children) return null;

  return (
    <TooltipProvider delay={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          onClick={(e) => {
            if (isTouch) setOpen((prev) => !prev);
            onClick?.(e);
          }}
          className="rounded-full"
          {...props}
        >
          <Icon name="info" className="text-muted-foreground size-4" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{children}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
StatusComponentDescription.displayName = "StatusComponentDescription";

export function StatusComponentIcon({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <UnifiedStatusIcon variant="component" className={className} {...props} />
  );
}
StatusComponentIcon.displayName = "StatusComponentIcon";

export function StatusComponentFooter({
  data,
  isLoading,
}: {
  data: StatusBarData[];
  isLoading?: boolean;
}) {
  const labels = useStatusBlocksLabels();
  return (
    <div
      data-slot="status-component-footer"
      className="text-muted-foreground flex flex-row items-center justify-between font-mono text-xs leading-none"
    >
      <div>
        {isLoading ? (
          <Skeleton className="h-3 w-18" />
        ) : data.length > 0 ? (
          dayjs(data[0].day).fromNow()
        ) : (
          "-"
        )}
      </div>
      <div>{labels.today}</div>
    </div>
  );
}
StatusComponentFooter.displayName = "StatusComponentFooter";

export function StatusComponentUptime({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-component-uptime"
      className={cn(
        "text-foreground/80 font-mono text-sm leading-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
StatusComponentUptime.displayName = "StatusComponentUptime";

export function StatusComponentUptimeSkeleton({
  className,
  ...props
}: React.ComponentProps<typeof Skeleton>) {
  return <Skeleton className={cn("h-4 w-16", className)} {...props} />;
}

// Labels: StatusBlocksI18nProvider -> labels.systemStatus[variant].short.
export function StatusComponentStatus({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const labels = useStatusBlocksLabels();
  return (
    <div
      data-slot="status-component-status"
      className={cn(
        "font-mono text-sm leading-none",
        "group-data-[variant=success]/component:text-success",
        "group-data-[variant=degraded]/component:text-warning",
        "group-data-[variant=error]/component:text-destructive",
        "group-data-[variant=info]/component:text-info",
        className,
      )}
      {...props}
    >
      <span className="hidden group-data-[variant=success]/component:block">
        {labels.systemStatus.success.short}
      </span>
      <span className="hidden group-data-[variant=degraded]/component:block">
        {labels.systemStatus.degraded.short}
      </span>
      <span className="hidden group-data-[variant=error]/component:block">
        {labels.systemStatus.error.short}
      </span>
      <span className="hidden group-data-[variant=info]/component:block">
        {labels.systemStatus.info.short}
      </span>
    </div>
  );
}
StatusComponentStatus.displayName = "StatusComponentStatus";
