"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useUpscalerCatalogQuery } from "@/hooks/ai/image-catalog-hook";
import { cn } from "@/lib/utils";
import { UPSCALER_MULTIPLIERS as MULTIPLIERS } from "../image-constants";

export type UpscalerFieldPatch = {
  upscaler?: string;
  multiplier?: number;
  hiresSteps?: number;
  denoise?: number;
};

type Props = {
  upscaler: string | undefined;
  multiplier: number | undefined;
  hiresSteps: number | undefined;
  denoise: number | undefined;
  onChange: (patch: UpscalerFieldPatch) => void;
};

// The multiplier a switch-on restores when the user has no previous choice.
const DEFAULT_MULTIPLIER = 1.5;

export function UpscalerField(props: Props) {
  const t = useTranslations();
  // On means "renders larger": the multiplier IS the feature, so a value above 1 is the
  // enabled state rather than a separate flag.
  const enabled = (props.multiplier ?? 1) > 1;
  // Collapsed by default: these only matter to someone upscaling, and left expanded they
  // doubled the length of the form for everyone else. Opens itself when a multiplier is
  // already set, so a restored snapshot does not hide settings that are in effect.
  const [open, setOpen] = useState(enabled);
  const catalog = useUpscalerCatalogQuery({});
  const items = catalog.data?.items ?? [];

  const upscaler = props.upscaler;
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
        onClick={() => {
          if (enabled) setOpen((o) => !o);
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
      >
        <Icon
          name={expanded ? "chevron-down" : "chevron-right"}
          className="h-4 w-4"
        />
        {t("IMAGE.UPSCALE_SECTION")}
        <span className="ml-auto flex items-center gap-2">
          {/* Say the size it renders at, not just that it is on: this multiplies the pixel
              count, and the cost with it, which is exactly what was invisible before. */}
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
              // Off is a multiplier of 1: the server reads scale <= 1 as no upscale, so this
              // is the value that actually stops it, not merely a hidden panel.
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
                    // "Custom" carries no multiplier to apply: it lights up on its own when the
                    // value matches no preset. Clicking it did nothing, which reads as broken.
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
          {/* A backend that re-renders at the target size instead of running a dedicated
          upscale model offers no models to pick, and an empty select holding a value the
          provider ignores is worse than no control. */}
          {items.length > 0 && (
            <div>
              <Label className="mb-1 block">{t("IMAGE.UPSCALER")}</Label>
              <Select
                value={upscaler ?? ""}
                onValueChange={(v) =>
                  props.onChange({ upscaler: v || undefined })
                }
              >
                <SelectTrigger
                  aria-label={t("IMAGE.UPSCALER")}
                  className="w-full"
                >
                  <SelectValue placeholder={t("IMAGE.UPSCALER_AUTO")} />
                </SelectTrigger>
                <SelectContent>
                  {items.map((u) => (
                    <SelectItem key={u.id} value={u.air}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
