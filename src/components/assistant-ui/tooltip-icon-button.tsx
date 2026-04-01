"use client";

import { type ComponentPropsWithRef, forwardRef } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TooltipIconButtonProps = ComponentPropsWithRef<"button"> & {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
  variant?: "ghost" | "outline" | "default";
  size?: string;
};

export const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>(
  (
    {
      children,
      tooltip,
      side = "bottom",
      className,
      variant = "ghost",
      size: _size,
      ...rest
    },
    ref,
  ) => {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              ref={ref}
              type="button"
              className={cn(
                "aui-button-icon inline-flex size-6 shrink-0 items-center justify-center rounded-md p-1 text-sm outline-none transition-all select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                variant === "outline" &&
                  "border border-border bg-background shadow-xs hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30",
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
  },
);

TooltipIconButton.displayName = "TooltipIconButton";
