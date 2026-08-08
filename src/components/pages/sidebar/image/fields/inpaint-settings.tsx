"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

import { CivitaiResolverField } from "./civitai-resolver-field";
import type { CustomCheckpoint } from "../form/model-picker";

export type InpaintValue = {
  prompt?: string;
  negativePrompt?: string;
  strength?: number;
  model?: string;
  air?: string;
  airName?: string;
  airQuery?: string;
};

type Props = {
  value: InpaintValue;
  onChange: (patch: Partial<InpaintValue>) => void;
  /** The form's own prompt, shown as the placeholder so it is obvious what runs when the
   *  override is left empty. */
  fallbackPrompt?: string;
};

/**
 * Settings for the manual inpaint pass, rendered WITH the mask canvas.
 *
 * The values here are overrides: empty means the pass reuses what the form already holds.
 * They live next to the canvas rather than in the shared fields far above it, because the
 * brush drops the user at the bottom of a long form and the controls that drive the pass
 * were nowhere near what they were looking at.
 *
 * Distinct from the ADetailer section on purpose. ADetailer runs a detector over a finished
 * image and redraws whatever it finds; inpainting redraws the region the user painted, with
 * a real checkpoint they choose. Folding one into the other would have made the manual tool
 * inherit a YOLO model picker that has nothing to do with it.
 */
export function InpaintSettings(props: Props) {
  const t = useTranslations();
  const v = props.value;

  return (
    <div className="flex flex-col gap-4 rounded-md border p-3">
      <div>
        <Label className="mb-1 block">{t("IMAGE.INPAINT_MODEL")}</Label>
        <CivitaiResolverField
          value={
            v.air
              ? ({ air: v.air, name: v.airName ?? v.air } as CustomCheckpoint)
              : null
          }
          query={v.airQuery ?? ""}
          onQueryChange={(airQuery) => props.onChange({ airQuery })}
          onChange={(checkpoint) =>
            props.onChange({
              air: checkpoint?.air,
              airName: checkpoint?.name,
              model: checkpoint?.air,
            })
          }
        />
        <p className="text-muted-foreground mt-1 text-xs">
          {t("IMAGE.INPAINT_MODEL_HINT")}
        </p>
      </div>

      <div>
        <Label className="mb-1 block">{t("IMAGE.INPAINT_PROMPT")}</Label>
        <Textarea
          rows={2}
          value={v.prompt ?? ""}
          onChange={(e) => props.onChange({ prompt: e.target.value })}
          placeholder={
            props.fallbackPrompt || t("IMAGE.INPAINT_PROMPT_PLACEHOLDER")
          }
        />
      </div>

      <div>
        <Label className="mb-1 block">
          {t("IMAGE.INPAINT_NEGATIVE_PROMPT")}
        </Label>
        <Textarea
          rows={2}
          value={v.negativePrompt ?? ""}
          onChange={(e) => props.onChange({ negativePrompt: e.target.value })}
        />
      </div>

      <div>
        <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
          <Label>{t("IMAGE.INPAINT_STRENGTH")}</Label>
          <span className="tabular-nums">
            {(v.strength ?? 0.75).toFixed(2)}
          </span>
        </div>
        <Slider
          aria-label={t("IMAGE.INPAINT_STRENGTH")}
          min={0}
          max={1}
          step={0.05}
          value={[v.strength ?? 0.75]}
          onValueChange={(s) =>
            props.onChange({ strength: Array.isArray(s) ? s[0] : s })
          }
        />
        <p className="text-muted-foreground mt-1 text-xs">
          {t("IMAGE.INPAINT_STRENGTH_HINT")}
        </p>
      </div>
    </div>
  );
}
