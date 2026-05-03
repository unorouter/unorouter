"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TooltipIconButtonProps = React.ComponentPropsWithRef<"button"> & {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
  variant?: "ghost" | "outline" | "default";
  size?: string;
};

export function TooltipIconButton({
  children,
  tooltip,
  side = "bottom",
  className,
  variant = "ghost",
  size: _size,
  ref,
  ...rest
}: TooltipIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            ref={ref}
            type="button"
            className={cn(
              "aui-button-icon inline-flex size-6 shrink-0 items-center justify-center rounded-md p-1 text-sm transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              variant === "outline" &&
                "border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 border shadow-xs",
              variant === "default" &&
                "bg-primary text-primary-foreground hover:bg-primary/80",
              variant === "ghost" &&
                "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
              className,
            )}
            {...rest}
          />
        }
      >
        {children}
        <span className="sr-only">{tooltip}</span>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
