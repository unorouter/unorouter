"use client";

// Upscaler picker block. Replaces the legacy hires-fix denoise+scale
// pair with: discrete multiplier radios (1x/1.5x/2x/3x/4x/custom),
// Upscaler dropdown (catalog-driven), Hires Steps slider, and the
// existing Denoise slider as a fourth control.
//
// Used inside the txt2img form's Hires-fix section (extended) and as the
// only settings panel inside the Img2Img/Upscale sub-pill.

import { useTranslations } from "next-intl";

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
import { useUpscalerCatalogQuery } from "@/hooks/generation-hook";
import { cn } from "@/lib/utils";

const MULTIPLIERS: ReadonlyArray<{ id: string; value: number | null }> = [
  { id: "1x", value: 1 },
  { id: "1.5x", value: 1.5 },
  { id: "2x", value: 2 },
  { id: "3x", value: 3 },
  { id: "4x", value: 4 },
  { id: "custom", value: null },
];

type Props = {
  upscaler: string | undefined;
  multiplier: number | undefined;
  hiresSteps: number | undefined;
  denoise: number | undefined;
  onChange: (next: {
    upscaler?: string;
    multiplier?: number;
    hiresSteps?: number;
    denoise?: number;
  }) => void;
};

export function UpscalerField(props: Props) {
  const t = useTranslations();
  const catalog = useUpscalerCatalogQuery({});
  const items = catalog.data?.items ?? [];
  const multiplier = props.multiplier ?? 2;
  const denoise = props.denoise ?? 0.5;
  const hiresSteps = props.hiresSteps ?? 20;
  const activeMul =
    MULTIPLIERS.find((m) => m.value === multiplier)?.id ?? "custom";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label className="mb-2 block">{t("IMAGE.UPSCALER_MULTIPLIER")}</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {MULTIPLIERS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                if (m.value !== null) props.onChange({ multiplier: m.value });
              }}
              className={cn(
                "rounded-md border px-2 py-1.5 text-xs",
                activeMul === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {m.id}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="mb-1 block">{t("IMAGE.UPSCALER")}</Label>
        <Select
          value={props.upscaler ?? ""}
          onValueChange={(v) => props.onChange({ upscaler: v || undefined })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("IMAGE.UPSCALER_AUTO")} />
          </SelectTrigger>
          <SelectContent>
            {items.map((u) => (
              <SelectItem key={u.id} value={u.filename}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
            <Label>{t("IMAGE.UPSCALER_HIRES_STEPS")}</Label>
            <span className="tabular-nums">{hiresSteps}</span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              min={1}
              max={60}
              step={1}
              value={[hiresSteps]}
              onValueChange={(v) =>
                props.onChange({
                  hiresSteps: Array.isArray(v) ? v[0] : v,
                })
              }
              className="flex-1"
            />
            <Input
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
              min={0}
              max={1}
              step={0.05}
              value={[denoise]}
              onValueChange={(v) =>
                props.onChange({
                  denoise: Array.isArray(v) ? v[0] : v,
                })
              }
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={denoise}
              onChange={(e) =>
                props.onChange({
                  denoise: Number(e.target.value) || 0,
                })
              }
              className="w-16"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
