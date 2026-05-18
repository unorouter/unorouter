"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Preset = {
  id: "portrait" | "landscape" | "square" | "custom";
  width: number;
  height: number;
  i18nKey: string;
};

const PRESETS: ReadonlyArray<Preset> = [
  {
    id: "portrait",
    width: 768,
    height: 1152,
    i18nKey: "IMAGE.ASPECT_PORTRAIT",
  },
  {
    id: "landscape",
    width: 1152,
    height: 768,
    i18nKey: "IMAGE.ASPECT_LANDSCAPE",
  },
  { id: "square", width: 1024, height: 1024, i18nKey: "IMAGE.ASPECT_SQUARE" },
  { id: "custom", width: 0, height: 0, i18nKey: "IMAGE.ASPECT_CUSTOM" },
];

export function AspectRatioField(props: {
  width: number;
  height: number;
  onChange: (next: { width: number; height: number }) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const min = props.min ?? 128;
  const max = props.max ?? 5060;
  const matched = PRESETS.find(
    (p) =>
      p.id !== "custom" && p.width === props.width && p.height === props.height,
  );
  const activeId = matched ? matched.id : "custom";

  const onPickPreset = (preset: Preset) => {
    if (props.disabled) return;
    if (preset.id === "custom") return;
    props.onChange({ width: preset.width, height: preset.height });
  };

  const onWidth = (w: number) => {
    if (props.disabled) return;
    const clamped = Math.min(max, Math.max(min, Math.round(w)));
    props.onChange({ width: clamped, height: props.height });
  };
  const onHeight = (h: number) => {
    if (props.disabled) return;
    const clamped = Math.min(max, Math.max(min, Math.round(h)));
    props.onChange({ width: props.width, height: clamped });
  };

  return (
    <div className="flex flex-col gap-3">
      <Label>{t("IMAGE.ASPECT_RATIO")}</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={props.disabled}
            onClick={() => onPickPreset(p)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition-colors",
              activeId === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              props.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="font-medium">
              {t(p.i18nKey as Parameters<typeof t>[0])}
            </span>
            {p.id !== "custom" && (
              <span className="text-[10px] tabular-nums opacity-80">
                {p.width}x{p.height}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
            <span>{t("IMAGE.WIDTH")}</span>
            <span className="tabular-nums">{props.width}</span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              min={min}
              max={max}
              step={64}
              value={[props.width]}
              onValueChange={(v) => onWidth(Array.isArray(v) ? v[0] : v)}
              disabled={props.disabled}
              className="flex-1"
            />
            <Input
              type="number"
              min={min}
              max={max}
              step={1}
              value={props.width}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") return;
                const parsed = Number(raw);
                if (Number.isFinite(parsed)) onWidth(parsed);
              }}
              disabled={props.disabled}
              className="w-20 shrink-0 text-center"
            />
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
            <span>{t("IMAGE.HEIGHT")}</span>
            <span className="tabular-nums">{props.height}</span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              min={min}
              max={max}
              step={64}
              value={[props.height]}
              onValueChange={(v) => onHeight(Array.isArray(v) ? v[0] : v)}
              disabled={props.disabled}
              className="flex-1"
            />
            <Input
              type="number"
              min={min}
              max={max}
              step={1}
              value={props.height}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") return;
                const parsed = Number(raw);
                if (Number.isFinite(parsed)) onHeight(parsed);
              }}
              disabled={props.disabled}
              className="w-20 shrink-0 text-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
