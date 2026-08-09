"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ImageFormValues } from "@/lib/validation/image";
import { cn } from "@/lib/utils";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { UPSCALER_MULTIPLIERS as MULTIPLIERS } from "../image-constants";
import { LabeledSlider } from "./labeled-slider";

const DEFAULT_MULTIPLIER = 1.5;

type Props = {
  form: UseFormReturn<ImageFormValues>;
};

export function UpscalerField(props: Props) {
  const t = useTranslations();
  const form = props.form;
  const multiplierValue = useWatch({
    control: form.control,
    name: "params.hiresUpscale",
  });
  const hiresSteps =
    useWatch({ control: form.control, name: "params.hiresSteps" }) ?? 20;
  const denoise =
    useWatch({ control: form.control, name: "params.hiresDenoise" }) ?? 0.5;

  const setParam = (
    name: "params.hiresUpscale" | "params.hiresSteps" | "params.hiresDenoise",
    value: number,
  ) => form.setValue(name, value, { shouldDirty: true });

  // The multiplier IS the feature: above 1 = enabled, no separate flag. The server reads
  // scale <= 1 as no upscale.
  const enabled = (multiplierValue ?? 1) > 1;
  // Opens itself when a multiplier is set, so a restored snapshot shows what is in effect.
  const [open, setOpen] = useState(enabled);

  const multiplier = multiplierValue ?? DEFAULT_MULTIPLIER;
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
          setParam("params.hiresUpscale", DEFAULT_MULTIPLIER);
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
              setParam("params.hiresUpscale", c ? DEFAULT_MULTIPLIER : 1);
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
                      setParam("params.hiresUpscale", m.value);
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
            <LabeledSlider
              label={t("IMAGE.UPSCALER_HIRES_STEPS")}
              min={1}
              max={60}
              step={1}
              value={hiresSteps}
              onChange={(v) => setParam("params.hiresSteps", v)}
              withInput
            />
            <LabeledSlider
              label={t("IMAGE.UPSCALER_DENOISE")}
              min={0}
              max={1}
              step={0.05}
              value={denoise}
              onChange={(v) => setParam("params.hiresDenoise", v)}
              format={(v) => v.toFixed(2)}
              withInput
            />
          </div>
        </div>
      )}
    </div>
  );
}
