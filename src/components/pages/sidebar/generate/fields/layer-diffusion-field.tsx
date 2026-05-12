"use client";

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
  const v = props.value;
  const enabled = !!v;
  const weight = v?.weight ?? 1;
  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium">
          {t("IMAGE.LAYER_DIFFUSION")}
        </span>
        <Switch
          checked={enabled}
          onCheckedChange={(c) => props.onChange(c ? { weight: 1 } : undefined)}
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
            onValueChange={(s) =>
              props.onChange({
                weight: Array.isArray(s) ? s[0] : s,
              })
            }
          />
        </div>
      )}
    </div>
  );
}
