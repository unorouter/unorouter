import type { GenerationFormValues } from "@/lib/validation/playground";
import type { UseFormReturn } from "react-hook-form";

type GenerationForm = UseFormReturn<GenerationFormValues>;

// Merge a partial patch into form params; contains the one unavoidable cast (loosely-typed knobs widen to string from descriptors).
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
