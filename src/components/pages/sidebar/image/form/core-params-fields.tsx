"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { CollapsibleSection } from "../fields/collapsible-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlaygroundModelDescriptor } from "@/lib/ai/playground/models";
import type { GenerationFormValues } from "@/lib/validation/playground";
import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { SeedField, SliderParamField } from "./image-form-fields";

type Props = {
  form: UseFormReturn<GenerationFormValues>;
  descriptor: PlaygroundModelDescriptor;
};

export function CoreParamsFields(props: Props) {
  const t = useTranslations();
  const form = props.form;
  const descriptor = props.descriptor;

  const numParam = (
    key: "steps" | "cfg" | "guidance",
    fallback: number,
  ): number => {
    const params = form.watch("params") as
      Record<string, number | undefined> | undefined;
    return params?.[key] ?? fallback;
  };

  const steps = numParam("steps", descriptor.defaultParams.steps ?? 20);
  const cfg = numParam("cfg", descriptor.defaultParams.cfg ?? 7);
  // Shown on the closed header so the two knobs most worth checking do not require opening
  // the section to read.
  const summary = [
    steps !== undefined ? `${t("IMAGE.STEPS_LABEL")} ${steps}` : null,
    cfg !== undefined ? `${t("IMAGE.CFG_LABEL")} ${cfg}` : null,
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
          <SliderParamField
            control={form.control}
            name="params.steps"
            label={t("IMAGE.STEPS_LABEL")}
            min={1}
            max={50}
            step={1}
            value={numParam("steps", descriptor.defaultParams.steps ?? 20)}
          />

          {descriptor.supportsCfg && (
            <SliderParamField
              control={form.control}
              name="params.cfg"
              label={t("IMAGE.CFG_LABEL")}
              min={0}
              max={15}
              step={0.5}
              value={numParam("cfg", descriptor.defaultParams.cfg ?? 7)}
            />
          )}

          {descriptor.supportsGuidance && (
            <SliderParamField
              control={form.control}
              name="params.guidance"
              label={t("IMAGE.GUIDANCE_LABEL")}
              min={1}
              max={10}
              step={0.1}
              value={numParam(
                "guidance",
                descriptor.defaultParams.guidance ?? 4,
              )}
            />
          )}
        </div>

        {descriptor.supportsSampler ? (
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
                        field.value ?? descriptor.defaultParams.sampler ?? ""
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
                        {(descriptor.samplers ?? []).map((s) => (
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
            {/* Some backends fold the scheduler into the sampler and offer no separate list,
              which would render an empty select holding a value the provider rejects. */}
            {(descriptor.schedulers?.length ?? 0) > 0 && (
              <FormField
                control={form.control}
                name="params.scheduler"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("IMAGE.SCHEDULER_LABEL")}</FormLabel>
                    <FormControl>
                      <Select
                        value={
                          field.value ??
                          descriptor.defaultParams.scheduler ??
                          ""
                        }
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          aria-label={t("IMAGE.SCHEDULER_LABEL")}
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(descriptor.schedulers ?? []).map((s) => (
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
            )}
          </div>
        ) : null}
      </CollapsibleSection>
      {/* Outside the disclosure: a seed is changed or reused per generation, not set once. */}
      <SeedField />
    </>
  );
}
