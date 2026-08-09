"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { clamp } from "@/lib/utils/base";

type Props = {
  label: string;
  /** Replaces the plain text label (e.g. a label with an inline toggle). */
  labelSlot?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  /** Renders the value next to the label; defaults to the raw number. */
  format?: (value: number) => string;
  /** Adds a numeric input beside the slider. */
  withInput?: boolean;
  disabled?: boolean;
};

// The one "label + value + slider" row; replaces the per-section hand-rolled copies.
export function LabeledSlider(props: Props) {
  const shown = props.format ? props.format(props.value) : String(props.value);
  return (
    <div>
      <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
        {props.labelSlot ?? <Label>{props.label}</Label>}
        <span className="tabular-nums">{shown}</span>
      </div>
      <div className="flex items-center gap-2">
        <Slider
          aria-label={props.label}
          min={props.min}
          max={props.max}
          step={props.step}
          value={[props.value]}
          onValueChange={(v) => props.onChange(Array.isArray(v) ? v[0] : v)}
          disabled={props.disabled}
          className="flex-1"
        />
        {props.withInput && (
          <Input
            type="number"
            aria-label={props.label}
            min={props.min}
            max={props.max}
            step={props.step}
            value={props.value}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return;
              const parsed = Number(raw);
              if (Number.isFinite(parsed)) props.onChange(parsed);
            }}
            onBlur={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed))
                props.onChange(clamp(parsed, props.min, props.max));
            }}
            disabled={props.disabled}
            className="w-20 shrink-0 text-center"
          />
        )}
      </div>
    </div>
  );
}
