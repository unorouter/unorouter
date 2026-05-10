"use client";

// Layer Diffusion: transparent-PNG output via the layerdiffusion ComfyUI
// custom nodes. Single toggle + weight slider. When enabled, the worker
// branches the VAE decode through the LayerDiffusion subgraph and saves
// the resulting PNG with an alpha channel.

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type Props = {
  value: { weight: number } | undefined;
  onChange: (next: { weight: number } | undefined) => void;
};

export function LayerDiffusionField(props: Props) {
  const t = useTranslations();
  const enabled = !!props.value;
  const weight = props.value?.weight ?? 1;

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium">
          {t("IMAGE.LAYER_DIFFUSION")}
        </span>
        <Switch
          checked={enabled}
          onCheckedChange={(c) =>
            props.onChange(c ? { weight: 1 } : undefined)
          }
        />
      </div>
      {enabled && (
        <div className="border-t p-3">
          <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
            <Label>{t("IMAGE.LAYER_DIFFUSION_WEIGHT")}</Label>
            <span className="tabular-nums">{weight.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.05}
            value={[weight]}
            onValueChange={(v) =>
              props.onChange({ weight: Array.isArray(v) ? v[0] : v })
            }
          />
        </div>
      )}
    </div>
  );
}
