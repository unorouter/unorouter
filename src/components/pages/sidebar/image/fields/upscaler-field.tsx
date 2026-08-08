"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { UPSCALER_MULTIPLIERS as MULTIPLIERS } from "../image-constants";

type UpscalerFieldPatch = {
  multiplier?: number;
  hiresSteps?: number;
  denoise?: number;
};

type Props = {
  multiplier: number | undefined;
  hiresSteps: number | undefined;
  denoise: number | undefined;
  onChange: (patch: UpscalerFieldPatch) => void;
};

const DEFAULT_MULTIPLIER = 1.5;

export function UpscalerField(props: Props) {
  const t = useTranslations();
  // The multiplier IS the feature: above 1 = enabled, no separate flag.
  const enabled = (props.multiplier ?? 1) > 1;
  // Opens itself when a multiplier is set, so a restored snapshot shows what is in effect.
  const [open, setOpen] = useState(enabled);

  const multiplier = props.multiplier ?? DEFAULT_MULTIPLIER;
  const hiresSteps = props.hiresSteps ?? 20;
  const denoise = props.denoise ?? 0.5;
  const activeMul =
    MULTIPLIERS.find((m) => m.value === multiplier)?.id ?? "custom";
  const expanded = open && enabled;

  return (
    <div className="rounded-md border">
      <button
        type="button"
        // Tapping the header while off means "I want this": switch on and expand.
        onClick={() => {
          if (enabled) {
            setOpen((o) => !o);
            return;
          }
          setOpen(true);
          props.onChange({ multiplier: DEFAULT_MULTIPLIER });
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
      >
        <Icon
          name={expanded ? "chevron-down" : "chevron-right"}
          className="h-4 w-4"
        />
        {t("IMAGE.UPSCALE_SECTION")}
        <span className="ml-auto flex items-center gap-2">
          {/* Show the multiplier on the closed header: it multiplies the cost. */}
          {enabled && (
            <span className="text-primary text-xs tabular-nums">
              {multiplier}x
            </span>
          )}
          <Switch
            aria-label={t("IMAGE.UPSCALE_SECTION")}
            checked={enabled}
            onCheckedChange={(c) => {
              setOpen(c);
              // Off = multiplier 1; the server reads scale <= 1 as no upscale.
              props.onChange({ multiplier: c ? DEFAULT_MULTIPLIER : 1 });
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </span>
      </button>
      {!expanded ? null : (
        <div className="flex flex-col gap-4 border-t p-3">
          <div>
            <Label className="mb-2 block">
              {t("IMAGE.UPSCALER_MULTIPLIER")}
            </Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {MULTIPLIERS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (m.value !== null) {
                      props.onChange({ multiplier: m.value });
                    }
                  }}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs",
                    activeMul === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                    // "Custom" lights up on its own when no preset matches; inert by markup.
                    m.value === null
                      ? "pointer-events-none"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {m.id}
                </button>
              ))}
            </div>
          </div>
          {/* No upscaler-model picker: a hires pass IS a re-render at the target size,
              and the backend has no upscaler category. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <Label>{t("IMAGE.UPSCALER_HIRES_STEPS")}</Label>
                <span className="tabular-nums">{hiresSteps}</span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  aria-label={t("IMAGE.UPSCALER_HIRES_STEPS")}
                  min={1}
                  max={60}
                  step={1}
                  value={[hiresSteps]}
                  onValueChange={(v) =>
                    props.onChange({ hiresSteps: Array.isArray(v) ? v[0] : v })
                  }
                  className="flex-1"
                />
                <Input
                  aria-label={t("IMAGE.UPSCALER_HIRES_STEPS")}
                  type="number"
                  min={1}
                  max={60}
                  value={hiresSteps}
                  onChange={(e) =>
                    props.onChange({
                      hiresSteps: Number(e.target.value) || hiresSteps,
                    })
                  }
                  className="w-16"
                />
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <Label>{t("IMAGE.UPSCALER_DENOISE")}</Label>
                <span className="tabular-nums">{denoise.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  aria-label={t("IMAGE.UPSCALER_DENOISE")}
                  min={0}
                  max={1}
                  step={0.05}
                  value={[denoise]}
                  onValueChange={(v) =>
                    props.onChange({ denoise: Array.isArray(v) ? v[0] : v })
                  }
                  className="flex-1"
                />
                <Input
                  aria-label={t("IMAGE.UPSCALER_DENOISE")}
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={denoise}
                  onChange={(e) =>
                    props.onChange({ denoise: Number(e.target.value) || 0 })
                  }
                  className="w-16"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
