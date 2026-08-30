"use client";

import { imageParams } from "@/lib/ai/image/models";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues } from "@/lib/validation/image";
import { Controller, type UseFormReturn } from "react-hook-form";
import { AdetailerSection } from "../../fields/adetailer-section";
import { UpscalerField } from "../../fields/upscaler-field";

type Props = {
  form: UseFormReturn<ImageFormValues>;
  descriptor: ImageModelDescriptor;
};

// ADetailer and upscale bind through their own Controller, so neither re-renders
// the form root.
export function AdvancedFields(props: Props) {
  const form = props.form;
  const descriptor = props.descriptor;

  return (
    <>
      {imageParams(descriptor).supportsAdetailer && (
        <Controller
          control={form.control}
          name="params.adetailer"
          render={({ field }) => (
            <AdetailerSection value={field.value} onChange={field.onChange} />
          )}
        />
      )}

      {imageParams(descriptor).supportsHiresFix && (
        <UpscalerField form={form} />
      )}
    </>
  );
}
