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

// Clamping per keystroke makes the box uneditable: "5" toward 512 is rewritten before key 2.
function DimensionInput(props: {
  label: string;
  value: number;
  min: number;
  max: number;
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
      className="w-20 shrink-0 text-center"
    />
  );
}

const MIN = 128;
const MAX = 5060;

export function AspectRatioSection() {
  const t = useTranslations();
  const form = useFormContext<ImageFormValues>();
  const size = {
    width: useWatch({ control: form.control, name: "params.width" }) ?? 1024,
    height: useWatch({ control: form.control, name: "params.height" }) ?? 1024,
  };
  const matched = PRESETS.find(
    (p) =>
      p.id !== "custom" && p.width === size.width && p.height === size.height,
  );
  const activeId = matched ? matched.id : "custom";
  const setSide = (side: "width" | "height", v: number) =>
    patchParams(form, { ...size, [side]: clamp(Math.round(v), MIN, MAX) });

  return (
    <div className="flex flex-col gap-3">
      <Label>{t("IMAGE.ASPECT_RATIO")}</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={activeId === p.id}
            onClick={() =>
              p.id !== "custom" &&
              patchParams(form, { width: p.width, height: p.height })
            }
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition-colors",
              activeId === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
              p.id === "custom"
                ? "pointer-events-none"
                : "hover:bg-accent hover:text-accent-foreground",
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
        {(
          [
            ["width", "IMAGE.WIDTH"],
            ["height", "IMAGE.HEIGHT"],
          ] as const
        ).map((dim) => (
          <div key={dim[0]}>
            <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
              <span>{t(dim[1])}</span>
              <span className="tabular-nums">{size[dim[0]]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Slider
                aria-label={t(dim[1])}
                min={MIN}
                max={MAX}
                step={64}
                value={[size[dim[0]]]}
                onValueChange={(v) =>
                  setSide(dim[0], Array.isArray(v) ? v[0] : v)
                }
                className="flex-1"
              />
              <DimensionInput
                label={t(dim[1])}
                value={size[dim[0]]}
                min={MIN}
                max={MAX}
                onCommit={(v) => setSide(dim[0], v)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
