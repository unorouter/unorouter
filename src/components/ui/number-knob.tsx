"use client";

import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
  fallback?: number;
  disabled?: boolean;
  disabledReason?: string;
  toggleable?: boolean;
  toggleReason?: string;
};

export function NumberKnob(props: Props) {
  const step = props.step ?? 0.01;
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 3;
  const visible = props.value ?? props.fallback ?? props.min;
  const isOff = props.value === null;
  const off = props.disabled || (props.toggleable ? isOff : false);

  const body = (
    <div
      className={cn(
        "flex flex-col gap-2",
        props.disabled && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-foreground text-sm">{props.label}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "bg-muted text-foreground rounded-md px-2 py-0.5 font-mono text-xs tabular-nums",
              off && "text-muted-foreground",
            )}
          >
            {off ? "off" : visible.toFixed(decimals)}
          </span>
          {props.toggleable && !props.disabled && (
            <Switch
              checked={!isOff}
              onCheckedChange={(on) =>
                props.onChange(on ? (props.fallback ?? props.min) : null)
              }
            />
          )}
        </div>
      </div>
      <Slider
        min={props.min}
        max={props.max}
        step={step}
        value={[visible]}
        onValueChange={(v) => props.onChange(Array.isArray(v) ? v[0] : v)}
        disabled={off}
      />
    </div>
  );

  const reason = props.disabled
    ? props.disabledReason
    : isOff
      ? props.toggleReason
      : undefined;
  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<div className="cursor-help">{body}</div>} />
          <TooltipContent side="top">{reason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return body;
}
