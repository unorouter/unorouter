"use client";

import { Slider } from "@/components/ui/slider";
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
};

/**
 * Openrouter-style sampling slider: label on the left, value pill on the right,
 * full-width slider underneath. Always interactive. Use the section-level
 * Reset/Remove to clear values back to null.
 */
export function NumberKnob(props: Props) {
  const step = props.step ?? 0.01;
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 3;
  const visible = props.value ?? props.fallback ?? props.min;
  const isOff = props.value === null;

  return (
    <div className="flex flex-col gap-2">
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
      />
    </div>
  );
}
