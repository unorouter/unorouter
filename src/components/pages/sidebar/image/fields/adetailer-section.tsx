"use client";

import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ModelFamily } from "@/lib/ai/image/models";
import { LabeledSlider } from "./labeled-slider";
import { LoraPicker, type LoraEntry } from "./lora-picker";
import { YOLO_MODELS } from "../image-constants";

export type AdetailerValue = {
  yoloModel: string;
  prompt?: string;
  negativePrompt?: string;
  steps?: number;
  confidence?: number;
  maskBlur?: number;
  denoise?: number;
  loras?: LoraEntry[];
};

type Props = {
  family: ModelFamily;
  value: AdetailerValue | undefined;
  onChange: (next: AdetailerValue | undefined) => void;
};

export const ADETAILER_DEFAULTS: AdetailerValue = {
  yoloModel: "face_yolov8s.pt",
  steps: 0,
  confidence: 0.5,
  maskBlur: 4,
  denoise: 0.25,
  loras: [],
};

export function AdetailerSection(props: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(!!props.value);
  const enabled = !!props.value;
  const v = props.value ?? ADETAILER_DEFAULTS;
  const stepsToggleOn = (props.value?.steps ?? 0) > 0;
  const expanded = open && enabled;

  const update = (patch: Partial<AdetailerValue>) => {
    if (!props.value) return;
    props.onChange({ ...props.value, ...patch });
  };

  return (
    <div className="rounded-md border">
      <button
        type="button"
        // Same as the upscale section: a header that ignores the tap while off looks like a
        // broken dropdown, so opening it turns the feature on.
        onClick={() => {
          if (enabled) {
            setOpen((o) => !o);
            return;
          }
          setOpen(true);
          props.onChange({ ...ADETAILER_DEFAULTS });
        }}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          {expanded ? (
            <Icon name="chevron-down" className="h-4 w-4" />
          ) : (
            <Icon name="chevron-right" className="h-4 w-4" />
          )}
          {t("IMAGE.ADETAILER")}
        </span>
        <Switch
          aria-label={t("IMAGE.ADETAILER")}
          checked={enabled}
          onCheckedChange={(c) => {
            setOpen(c);
            props.onChange(c ? { ...ADETAILER_DEFAULTS } : undefined);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </button>
      {expanded && (
        <div className="flex flex-col gap-4 border-t p-3">
          <div>
            <Label className="mb-1 block">{t("IMAGE.ADETAILER_MODEL")}</Label>
            <Select
              value={v.yoloModel ?? undefined}
              onValueChange={(yoloModel) =>
                update({ yoloModel: yoloModel ?? undefined })
              }
            >
              <SelectTrigger
                aria-label={t("IMAGE.ADETAILER_MODEL")}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YOLO_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LoraPicker
            family={props.family}
            value={v.loras ?? []}
            onChange={(loras) =>
              update({ loras: loras.length > 0 ? loras : undefined })
            }
          />
          <div>
            <Label className="mb-1 block">{t("IMAGE.ADETAILER_PROMPT")}</Label>
            <Textarea
              rows={2}
              value={v.prompt ?? ""}
              onChange={(e) => update({ prompt: e.target.value })}
              placeholder={t("IMAGE.ADETAILER_PROMPT_PLACEHOLDER")}
            />
          </div>
          <div>
            <Label className="mb-1 block">
              {t("IMAGE.ADETAILER_NEGATIVE_PROMPT")}
            </Label>
            <Textarea
              rows={2}
              value={v.negativePrompt ?? ""}
              onChange={(e) => update({ negativePrompt: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabeledSlider
              label={t("IMAGE.ADETAILER_STEPS")}
              // Steps 0 = inherit, spelled as a toggle.
              labelSlot={
                <Label className="flex items-center gap-2">
                  <Switch
                    checked={stepsToggleOn}
                    onCheckedChange={(c) => update({ steps: c ? 20 : 0 })}
                  />
                  {t("IMAGE.ADETAILER_STEPS")}
                </Label>
              }
              min={0}
              max={60}
              step={1}
              value={v.steps ?? 0}
              onChange={(steps) => update({ steps })}
              disabled={!stepsToggleOn}
            />
            <LabeledSlider
              label={t("IMAGE.ADETAILER_CONFIDENCE")}
              min={0}
              max={1}
              step={0.05}
              value={v.confidence ?? 0.5}
              onChange={(confidence) => update({ confidence })}
              format={(x) => x.toFixed(2)}
            />
            <LabeledSlider
              label={t("IMAGE.ADETAILER_MASK_BLUR")}
              min={0}
              max={64}
              step={1}
              value={v.maskBlur ?? 4}
              onChange={(maskBlur) => update({ maskBlur })}
            />
            <LabeledSlider
              label={t("IMAGE.ADETAILER_DENOISE")}
              min={0}
              max={1}
              step={0.05}
              value={v.denoise ?? 0.25}
              onChange={(denoise) => update({ denoise })}
              format={(x) => x.toFixed(2)}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {t("IMAGE.ADETAILER_HINT")}
          </p>
        </div>
      )}
    </div>
  );
}
