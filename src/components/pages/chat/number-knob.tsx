"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type Props = {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
  /** Default value when the knob is toggled on. Falls back to the midpoint. */
  defaultOn?: number;
};

export function NumberKnob(props: Props) {
  const enabled = props.value !== null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{props.label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {enabled ? props.value : "off"}
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={(v) =>
              props.onChange(
                v
                  ? (props.defaultOn ?? (props.min + props.max) / 2)
                  : null,
              )
            }
          />
        </div>
      </div>
      {enabled && (
        <Slider
          min={props.min}
          max={props.max}
          step={props.step ?? 0.01}
          value={[props.value ?? 0]}
          onValueChange={(v) =>
            props.onChange(Array.isArray(v) ? v[0] : v)
          }
        />
      )}
    </div>
  );
}
