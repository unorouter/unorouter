"use client";

import { defaultParams, imageParams } from "@/lib/ai/image/models";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { CollapsibleSection } from "../../fields/collapsible-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues } from "@/lib/validation/image";
import { useTranslations } from "next-intl";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { SeedField, SliderParamField } from "../../fields/param-fields";

type Props = {
  form: UseFormReturn<ImageFormValues>;
  descriptor: ImageModelDescriptor;
};

export function CoreParamsFields(props: Props) {
  const t = useTranslations();
  const form = props.form;
  const descriptor = props.descriptor;

  // Shown on the closed header so the two knobs most worth checking do not require
  // opening the section to read.
  const steps =
    useWatch({ control: form.control, name: "params.steps" }) ??
    defaultParams(descriptor).steps ??
    20;
  const cfg =
    useWatch({ control: form.control, name: "params.cfg" }) ??
    defaultParams(descriptor).cfg ??
    7;
  const showSteps = imageParams(descriptor).supportsSteps === true;
  const summary = [
    showSteps ? `${t("IMAGE.STEPS_LABEL")} ${steps}` : null,
    imageParams(descriptor).supportsCfg
      ? `${t("IMAGE.CFG_LABEL")} ${cfg}`
      : null,
  ]
    .filter(Boolean)
    .join("  ");

  return (
    <>
      <CollapsibleSection
        title={t("IMAGE.GENERATION_SECTION")}
        summary={summary}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {showSteps && (
            <SliderParamField
              control={form.control}
              name="params.steps"
              label={t("IMAGE.STEPS_LABEL")}
              min={imageParams(descriptor).steps?.min ?? 1}
              max={imageParams(descriptor).steps?.max ?? 50}
              step={1}
              defaultValue={defaultParams(descriptor).steps ?? 20}
            />
          )}

          {imageParams(descriptor).supportsCfg && (
            <SliderParamField
              control={form.control}
              name="params.cfg"
              label={t("IMAGE.CFG_LABEL")}
              min={imageParams(descriptor).cfg?.min ?? 0}
              max={imageParams(descriptor).cfg?.max ?? 15}
              step={0.5}
              defaultValue={defaultParams(descriptor).cfg ?? 7}
            />
          )}
        </div>

        {imageParams(descriptor).supportsSampler ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="params.sampler"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("IMAGE.SAMPLER_LABEL")}</FormLabel>
                  <FormControl>
                    <Select
                      value={
                        field.value ?? defaultParams(descriptor).sampler ?? ""
                      }
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        aria-label={t("IMAGE.SAMPLER_LABEL")}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(imageParams(descriptor).samplers ?? []).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        ) : null}
      </CollapsibleSection>
      {/* Outside the disclosure: a seed is changed or reused per generation, not set
          once. Gated exactly like the server-side capability filter, which drops the
          seed for models that do not declare it. */}
      {imageParams(descriptor).supportsSeed && <SeedField />}
    </>
  );
}
