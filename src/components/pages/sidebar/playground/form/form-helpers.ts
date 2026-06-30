import type { GenerationFormValues } from "@/lib/validation/playground";
import type { UseFormReturn } from "react-hook-form";

type GenerationForm = UseFormReturn<GenerationFormValues>;

// Merge an arbitrary partial patch into form params; the patch is untyped (Record<string, unknown>) so the merged result needs one cast back to the params union.
export function patchParams(
  form: GenerationForm,
  patch: Record<string, unknown>,
): void {
  const cur = (form.watch("params") as Record<string, unknown>) ?? {};
  form.setValue(
    "params",
    { ...cur, ...patch } as GenerationFormValues["params"],
    { shouldDirty: true },
  );
}
