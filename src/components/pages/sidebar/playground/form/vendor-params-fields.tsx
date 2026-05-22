"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import {
  OutputFormatField,
  QualityField,
  SliderWithInput,
} from "./playground-form-fields";

type Props = {
  form: UseFormReturn<GenerationFormValues>;
  descriptor: PlaygroundModelDescriptor;
};

function hasVendorFields(d: PlaygroundModelDescriptor): boolean {
  return Boolean(
    d.supportsQuality ||
      d.supportsOutputFormat ||
      d.supportsBackground ||
      d.supportsWatermark ||
      d.supportsStrength ||
      d.supportsSeed,
  );
}

// Hosted (sync-image) vendor knobs: quality / output format / background /
// watermark / strength / seed. Renders nothing for ComfyUI-family models.
export function VendorParamsFields(props: Props) {
  const t = useTranslations();
  const form = props.form;
  const descriptor = props.descriptor;
  if (!hasVendorFields(descriptor)) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {descriptor.supportsQuality && descriptor.qualityChoices && (
        <QualityField
          choices={descriptor.qualityChoices}
          label={t("IMAGE.QUALITY_LABEL")}
          placeholder={t("IMAGE.QUALITY_DEFAULT")}
        />
      )}

      {descriptor.supportsOutputFormat && descriptor.outputFormatChoices && (
        <OutputFormatField
          choices={descriptor.outputFormatChoices}
          label={t("IMAGE.OUTPUT_FORMAT_LABEL")}
          placeholder={t("IMAGE.OUTPUT_FORMAT_DEFAULT")}
        />
      )}

      {descriptor.supportsBackground && (
        <FormField
          control={form.control}
          name="params.background"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("IMAGE.BACKGROUND_LABEL")}</FormLabel>
              <FormControl>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("IMAGE.BACKGROUND_DEFAULT")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opaque">
                      {t("IMAGE.BACKGROUND_OPAQUE")}
                    </SelectItem>
                    <SelectItem value="transparent">
                      {t("IMAGE.BACKGROUND_TRANSPARENT")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
      )}

      {descriptor.supportsWatermark && (
        <FormField
          control={form.control}
          name="params.watermark"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
              <FormLabel className="m-0">
                {t("IMAGE.WATERMARK_LABEL")}
              </FormLabel>
              <FormControl>
                <input
                  type="checkbox"
                  checked={(field.value as boolean | undefined) ?? false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}

      {descriptor.supportsStrength && (
        <FormField
          control={form.control}
          name="params.strength"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("IMAGE.STRENGTH_LABEL")}</FormLabel>
              <FormControl>
                <SliderWithInput
                  min={0}
                  max={1}
                  step={0.05}
                  value={typeof field.value === "number" ? field.value : 0.5}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}

      {descriptor.supportsSeed && (
        <FormField
          control={form.control}
          name="params.seed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("IMAGE.SEED_LABEL")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t("IMAGE.SEED_RANDOMIZE")}
                  value={(field.value as number | undefined) ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
