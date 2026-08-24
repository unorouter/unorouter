import type { ImagePreset } from "@/lib/db/schema/client";
import type { ImageFormUi, ImageFormValues } from "@/lib/validation/image";
import type { UseFormReturn } from "react-hook-form";

type PresetTarget = {
  form: UseFormReturn<ImageFormValues>;
  adoptModelTab: (modelId: string) => void;
  changeModel: (modelId: string) => void;
};

export function applyPreset(target: PresetTarget, preset: ImagePreset): void {
  const form = target.form;
  target.adoptModelTab(preset.model);
  form.setValue("model", preset.model);
  target.changeModel(preset.model);
  form.setValue("negativePrompt", preset.negativePrompt ?? "");
  if (preset.params) form.setValue("params", preset.params);
  form.setValue("loras", preset.loras ?? undefined);
  const presetUi = preset.extraParams;
  if (presetUi) {
    const next: ImageFormUi = presetUi.air
      ? { ...presetUi }
      : { ...(form.getValues("ui") ?? {}), ...presetUi };
    form.setValue("ui", next, { shouldDirty: true });
  }
}
