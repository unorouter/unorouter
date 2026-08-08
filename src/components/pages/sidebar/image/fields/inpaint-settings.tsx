"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";

import { CivitaiResolverField } from "./civitai-resolver-field";
import type { CustomCheckpoint } from "../form/model-picker";

type Props = {
  /** The form's own prompt, shown as the placeholder so it is obvious what runs when the
   *  override is left empty. */
  fallbackPrompt?: string;
};

/**
 * Overrides for the manual inpaint pass, rendered next to the mask canvas; empty fields
 * reuse what the form holds. Each field binds its own Controller so keystrokes do not
 * re-render the whole form (canvas included). Distinct from ADetailer, which detects a
 * region instead of taking a painted one.
 */
export function InpaintSettings(props: Props) {
  const t = useTranslations();
  const form = useFormContext();

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
              render={({ field: queryField }) => (
                <CivitaiResolverField
                  value={
                    airField.value
                      ? ({
                          air: airField.value,
                          name:
                            (form.getValues("ui.inpaintAirName") as
                              string | undefined) ?? airField.value,
                        } as CustomCheckpoint)
                      : null
                  }
                  query={(queryField.value as string | undefined) ?? ""}
                  onQueryChange={queryField.onChange}
                  onChange={(checkpoint) => {
                    airField.onChange(checkpoint?.air);
                    form.setValue(
                      "ui.inpaintAirName" as never,
                      checkpoint?.name as never,
                      { shouldDirty: true },
                    );
                  }}
                />
              )}
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
              value={(field.value as string | undefined) ?? ""}
              onChange={field.onChange}
              placeholder={
                props.fallbackPrompt || t("IMAGE.INPAINT_PROMPT_PLACEHOLDER")
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
              value={(field.value as string | undefined) ?? ""}
              onChange={field.onChange}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="ui.inpaintStrength"
        render={({ field }) => {
          const strength = (field.value as number | undefined) ?? 0.75;
          return (
            <div>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <Label>{t("IMAGE.INPAINT_STRENGTH")}</Label>
                <span className="tabular-nums">{strength.toFixed(2)}</span>
              </div>
              <Slider
                aria-label={t("IMAGE.INPAINT_STRENGTH")}
                min={0}
                max={1}
                step={0.05}
                value={[strength]}
                onValueChange={(s) =>
                  field.onChange(Array.isArray(s) ? s[0] : s)
                }
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {t("IMAGE.INPAINT_STRENGTH_HINT")}
              </p>
            </div>
          );
        }}
      />
    </div>
  );
}
