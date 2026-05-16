"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";
import { LuRefreshCcw } from "react-icons/lu";

type Props = {
  label: string;
  /** Current value, undefined = project default. */
  value: number | undefined;
  /** Project default shown in the input placeholder. */
  fallback: number;
  min: number;
  max: number;
  step: number;
  /** Optional unit suffix shown in the input. Visual only. */
  unit?: string;
  onChange: (next: number | undefined) => void;
};

/** Slider + numeric input + reset. Matic asked for tap-to-type next to every
 *  slider; reuse this pattern in generate page later. */
export function ThemeSpacingSlider(props: Props) {
  const t = useTranslations();
  const display = props.value ?? props.fallback;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-foreground text-sm">{props.label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={props.value ?? ""}
            placeholder={String(props.fallback)}
            min={props.min}
            max={props.max}
            step={props.step}
            onChange={(e) =>
              props.onChange(
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
            className="h-7 w-20 font-mono text-xs"
          />
          {props.unit ? (
            <span className="text-muted-foreground font-mono text-[10px]">
              {props.unit}
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => props.onChange(undefined)}
            aria-label={t("THEME.RESET_FIELD")}
            disabled={props.value == null}
          >
            <LuRefreshCcw className="size-3.5" />
          </Button>
        </div>
      </div>
      <Slider
        min={props.min}
        max={props.max}
        step={props.step}
        value={[display]}
        onValueChange={(v) => props.onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}
