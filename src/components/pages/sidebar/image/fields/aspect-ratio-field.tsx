"use client";

import { clamp } from "@/lib/utils/base";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ImageFormValues } from "@/lib/validation/image";
import type { TranslationKey } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { patchParams } from "../form/logic/form-helpers";

// Connected wrapper: subscribes to its own params so size changes do not re-render the
// form root.
export function AspectRatioSection() {
  const form = useFormContext<ImageFormValues>();
  const width =
    useWatch({ control: form.control, name: "params.width" }) ?? 1024;
  const height =
    useWatch({ control: form.control, name: "params.height" }) ?? 1024;
  return (
    <AspectRatioField
      width={width}
      height={height}
      onChange={(next) => patchParams(form, next)}
    />
  );
}

type Preset = {
  id: "portrait" | "landscape" | "square" | "custom";
  width: number;
  height: number;
  i18nKey: TranslationKey;
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

// Clamping on every keystroke makes the box uneditable: typing "5" toward 512 is rewritten to
// the minimum before the next key lands, and an empty box (mid-retype) is rejected outright.
// Hold the raw text while the user is typing and only clamp when they commit.
function DimensionInput(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    props.onCommit(clamp(Math.round(parsed), props.min, props.max));
  };

  return (
    <Input
      aria-label={props.label}
      type="number"
      min={props.min}
      max={props.max}
      step={1}
      value={draft ?? props.value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(e.currentTarget.value);
        }
        if (e.key === "Escape") setDraft(null);
      }}
      disabled={props.disabled}
      className="w-20 shrink-0 text-center"
    />
  );
}

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
    const clamped = clamp(Math.round(w), min, max);
    props.onChange({ width: clamped, height: props.height });
  };
  const onHeight = (h: number) => {
    if (props.disabled) return;
    const clamped = clamp(Math.round(h), min, max);
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
            // "Custom" lights up on its own when no preset matches; inert by markup.
            disabled={props.disabled}
            aria-pressed={activeId === p.id}
            onClick={() => onPickPreset(p)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition-colors",
              activeId === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
              p.id === "custom"
                ? "pointer-events-none"
                : "hover:bg-accent hover:text-accent-foreground",
              props.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="font-medium">{t(p.i18nKey)}</span>
            {p.id !== "custom" && (
              <span className="text-[10px] tabular-nums">
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
              aria-label={t("IMAGE.WIDTH")}
              min={min}
              max={max}
              step={64}
              value={[props.width]}
              onValueChange={(v) => onWidth(Array.isArray(v) ? v[0] : v)}
              disabled={props.disabled}
              className="flex-1"
            />
            <DimensionInput
              label={t("IMAGE.WIDTH")}
              value={props.width}
              min={min}
              max={max}
              disabled={props.disabled}
              onCommit={onWidth}
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
              aria-label={t("IMAGE.HEIGHT")}
              min={min}
              max={max}
              step={64}
              value={[props.height]}
              onValueChange={(v) => onHeight(Array.isArray(v) ? v[0] : v)}
              disabled={props.disabled}
              className="flex-1"
            />
            <DimensionInput
              label={t("IMAGE.HEIGHT")}
              value={props.height}
              min={min}
              max={max}
              disabled={props.disabled}
              onCommit={onHeight}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
