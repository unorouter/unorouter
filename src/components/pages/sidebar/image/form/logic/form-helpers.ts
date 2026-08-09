import type { ImageFormValues, ImageParams } from "@/lib/validation/image";
import type { UseFormReturn } from "react-hook-form";

// Bulk param merge from the CURRENT values (getValues, not a render snapshot); params
// has no concurrent cross-component writers, unlike ui.
export function patchParams(
  form: UseFormReturn<ImageFormValues>,
  patch: Partial<ImageParams>,
): void {
  form.setValue(
    "params",
    { ...(form.getValues("params") ?? {}), ...patch },
    { shouldDirty: true },
  );
}
