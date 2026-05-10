"use client";

// ADetailer section: face/hand fixer. Wraps a small subform that builds a
// `params.adetailer` object. The worker fires this as a second pass after
// the main diffusion: YOLO detects faces/hands, the model inpaints each
// region with the (optional) ADetailer prompt + LoRA chain, then composites.
//
// Available on the SDXL-family templates. Off by default; the parent
// passes value === undefined to mean "off" and the section is collapsed.

import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import type { ModelFamily } from "@/lib/config/generation-models";
import { LoraPicker, type LoraEntry } from "./lora-picker";

// YOLO + mediapipe choices ship with the RunPod Impact Pack. The list
// matches what's on the network volume; the worker rejects unknown
// names. Keep this in sync with comfyui-runpod-memory.md.
const YOLO_MODELS: ReadonlyArray<string> = [
  "face_yolov8s.pt",
  "face_yolov9c.pt",
  "face_yolov8m.pt",
  "face_yolov8n.pt",
  "face_yolov8n_v2.pt",
  "hand_yolov8s.pt",
  "hand_yolov9c.pt",
  "hand_yolov8n.pt",
  "person_yolov8n-seg.pt",
  "person_yolov8m-seg.pt",
  "person_yolov8s-seg.pt",
  "mediapipe_face_full",
  "mediapipe_face_mesh",
  "mediapipe_face_short",
];

export type AdetailerValue = {
  yoloModel: string;
  prompt?: string;
  negativePrompt?: string;
  steps?: number;
  confidence?: number;
  maskBlur?: number;
  denoise?: number;
  inpaintOnlyMasked?: boolean;
  loras?: LoraEntry[];
};

type Props = {
  family: ModelFamily;
  value: AdetailerValue | undefined;
  onChange: (next: AdetailerValue | undefined) => void;
};

const DEFAULTS: AdetailerValue = {
  yoloModel: "face_yolov8s.pt",
  steps: 0, // 0 = use base steps
  confidence: 0.5,
  maskBlur: 4,
  denoise: 0.25,
  inpaintOnlyMasked: true,
  loras: [],
};

export function AdetailerSection(props: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(!!props.value);
  const enabled = !!props.value;
  const v = props.value ?? DEFAULTS;
  const stepsToggleOn = (props.value?.steps ?? 0) > 0;

  const update = (patch: Partial<AdetailerValue>) => {
    if (!props.value) return;
    props.onChange({ ...props.value, ...patch });
  };

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <LuChevronDown className="h-4 w-4" />
          ) : (
            <LuChevronRight className="h-4 w-4" />
          )}
          {t("IMAGE.ADETAILER")}
        </span>
        <Switch
          checked={enabled}
          onCheckedChange={(c) =>
            props.onChange(c ? { ...DEFAULTS } : undefined)
          }
          onClick={(e) => e.stopPropagation()}
        />
      </button>
      {open && enabled && (
        <div className="flex flex-col gap-4 border-t p-3">
          <div>
            <Label className="mb-1 block">{t("IMAGE.ADETAILER_MODEL")}</Label>
            <Select
              value={v.yoloModel}
              onValueChange={(yoloModel) => update({ yoloModel })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YOLO_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LoraPicker
            family={props.family}
            value={v.loras ?? []}
            onChange={(loras) => update({ loras })}
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
            <div>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <Label className="flex items-center gap-2">
                  <Switch
                    checked={stepsToggleOn}
                    onCheckedChange={(c) =>
                      update({ steps: c ? 20 : 0 })
                    }
                  />
                  {t("IMAGE.ADETAILER_STEPS")}
                </Label>
                <span className="tabular-nums">{v.steps ?? 0}</span>
              </div>
              <Slider
                min={0}
                max={60}
                step={1}
                value={[v.steps ?? 0]}
                onValueChange={(s) =>
                  update({ steps: Array.isArray(s) ? s[0] : s })
                }
                disabled={!stepsToggleOn}
              />
            </div>
            <div>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <Label>{t("IMAGE.ADETAILER_CONFIDENCE")}</Label>
                <span className="tabular-nums">
                  {(v.confidence ?? 0.5).toFixed(2)}
                </span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[v.confidence ?? 0.5]}
                onValueChange={(s) =>
                  update({ confidence: Array.isArray(s) ? s[0] : s })
                }
              />
            </div>
            <div>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <Label>{t("IMAGE.ADETAILER_MASK_BLUR")}</Label>
                <span className="tabular-nums">{v.maskBlur ?? 4}</span>
              </div>
              <Slider
                min={0}
                max={64}
                step={1}
                value={[v.maskBlur ?? 4]}
                onValueChange={(s) =>
                  update({ maskBlur: Array.isArray(s) ? s[0] : s })
                }
              />
            </div>
            <div>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <Label>{t("IMAGE.ADETAILER_DENOISE")}</Label>
                <span className="tabular-nums">
                  {(v.denoise ?? 0.25).toFixed(2)}
                </span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[v.denoise ?? 0.25]}
                onValueChange={(s) =>
                  update({ denoise: Array.isArray(s) ? s[0] : s })
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={v.inpaintOnlyMasked ?? true}
              onCheckedChange={(c) =>
                update({ inpaintOnlyMasked: c === true })
              }
            />
            {t("IMAGE.ADETAILER_INPAINT_ONLY_MASKED")}
          </label>
          <p className="text-muted-foreground text-xs">
            {/* dev-only hint to avoid noise */}
            <span className="hidden">
              {Number.isFinite(v.steps ? 1 : 0) ? "" : ""}
            </span>
            <Input className="hidden" type="hidden" />
          </p>
        </div>
      )}
    </div>
  );
}
