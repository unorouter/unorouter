"use client";

import { Slider } from "@/components/ui/slider";
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
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Default value when value is null (slider sits at this position visually). */
  fallback?: number;
  /** Disable the slider with a tooltip explaining why (e.g. unsupported by provider). */
  disabled?: boolean;
  /** Tooltip text shown when disabled. */
  disabledReason?: string;
};

/**
 * Openrouter-style sampling slider: label on the left, value pill on the right,
 * full-width slider underneath. When `disabled` is set, the slider is muted
 * and a tooltip surfaces `disabledReason` on hover.
 */
export function NumberKnob(props: Props) {
  const step = props.step ?? 0.01;
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 3;
  const visible = props.value ?? props.fallback ?? props.min;
  const isOff = props.value === null;

  const body = (
    <div
      className={cn(
        "flex flex-col gap-2",
        props.disabled && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-foreground text-sm">{props.label}</span>
        <span
          className={cn(
            "bg-muted text-foreground rounded-md px-2 py-0.5 font-mono text-xs tabular-nums",
            isOff && "text-muted-foreground",
          )}
        >
          {visible.toFixed(decimals)}
        </span>
      </div>
      <Slider
        min={props.min}
        max={props.max}
        step={step}
        value={[visible]}
        onValueChange={(v) => props.onChange(Array.isArray(v) ? v[0] : v)}
        disabled={props.disabled}
      />
    </div>
  );

  if (props.disabled && props.disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<div className="cursor-help">{body}</div>} />
          <TooltipContent side="top">{props.disabledReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return body;
}
