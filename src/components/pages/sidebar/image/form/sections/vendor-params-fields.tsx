"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
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
import type { UseFormReturn } from "react-hook-form";
import { SelectParamField, SliderParamField } from "../../fields/param-fields";

type Props = {
  form: UseFormReturn<ImageFormValues>;
  descriptor: ImageModelDescriptor;
};

function hasVendorFields(d: ImageModelDescriptor): boolean {
  return Boolean(
    d.supportsQuality ||
    d.supportsOutputFormat ||
    d.supportsBackground ||
    d.supportsStrength,
  );
}

export function VendorParamsFields(props: Props) {
  const t = useTranslations();
  const form = props.form;
  const descriptor = props.descriptor;
  if (!hasVendorFields(descriptor)) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {descriptor.supportsQuality && descriptor.qualityChoices && (
        <SelectParamField
          name="params.quality"
          choices={descriptor.qualityChoices}
          label={t("IMAGE.QUALITY_LABEL")}
          placeholder={t("IMAGE.QUALITY_DEFAULT")}
        />
      )}

      {descriptor.supportsOutputFormat && descriptor.outputFormatChoices && (
        <SelectParamField
          name="params.outputFormat"
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

      {descriptor.supportsStrength && (
        <SliderParamField
          control={form.control}
          name="params.strength"
          label={t("IMAGE.STRENGTH_LABEL")}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
        />
      )}
    </div>
  );
}
