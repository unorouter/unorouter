"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LabeledSlider } from "./labeled-slider";
import type { ImageFormValues } from "@/lib/validation/image";
import { useTranslations } from "next-intl";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { CivitaiResolverField } from "./civitai-resolver-field";
import type { CustomCheckpoint } from "../form/sections/model-picker";

/**
 * Overrides for the manual inpaint pass, rendered next to the mask canvas; empty fields
 * reuse what the form holds. Each field binds its own Controller so keystrokes do not
 * re-render the whole form (canvas included). Distinct from ADetailer, which detects a
 * region instead of taking a painted one.
 */
export function InpaintSettings() {
  const t = useTranslations();
  const form = useFormContext<ImageFormValues>();
  // The form's own prompt is the placeholder, so it is obvious what runs when the
  // override is left empty.
  const fallbackPrompt =
    useWatch({ control: form.control, name: "prompt" }) ?? "";

  return (
    <div className="flex flex-col gap-4 rounded-md border p-3">
      <div>
        <Label className="mb-1 block">{t("IMAGE.INPAINT_MODEL")}</Label>
        <Controller
          control={form.control}
          name="ui.inpaintAir"
          render={({ field: airField }) => (
            <Controller
              control={form.control}
              name="ui.inpaintAirQuery"
              render={({ field: queryField }) => {
                const air = airField.value;
                const selected: CustomCheckpoint | null = air
                  ? {
                      air,
                      name: form.getValues("ui.inpaintAirName") ?? air,
                      architecture: null,
                      heroImage: null,
                      nsfwLevel: null,
                    }
                  : null;
                return (
                  <CivitaiResolverField
                    value={selected}
                    query={queryField.value ?? ""}
                    onQueryChange={queryField.onChange}
                    onChange={(checkpoint) => {
                      airField.onChange(checkpoint?.air);
                      form.setValue("ui.inpaintAirName", checkpoint?.name, {
                        shouldDirty: true,
                      });
                    }}
                  />
                );
              }}
            />
          )}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          {t("IMAGE.INPAINT_MODEL_HINT")}
        </p>
      </div>

      <Controller
        control={form.control}
        name="ui.inpaintPrompt"
        render={({ field }) => (
          <div>
            <Label className="mb-1 block">{t("IMAGE.INPAINT_PROMPT")}</Label>
            <Textarea
              rows={2}
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder={
                fallbackPrompt || t("IMAGE.INPAINT_PROMPT_PLACEHOLDER")
              }
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="ui.inpaintNegativePrompt"
        render={({ field }) => (
          <div>
            <Label className="mb-1 block">
              {t("IMAGE.INPAINT_NEGATIVE_PROMPT")}
            </Label>
            <Textarea
              rows={2}
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="ui.inpaintStrength"
        render={({ field }) => (
          <div>
            <LabeledSlider
              label={t("IMAGE.INPAINT_STRENGTH")}
              min={0}
              max={1}
              step={0.05}
              value={field.value ?? 0.75}
              onChange={field.onChange}
              format={(v) => v.toFixed(2)}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {t("IMAGE.INPAINT_STRENGTH_HINT")}
            </p>
          </div>
        )}
      />
    </div>
  );
}
