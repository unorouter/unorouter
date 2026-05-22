import type { GenerationFormValues } from "@/lib/validation/playground";
import type { UseFormReturn } from "react-hook-form";

type GenerationForm = UseFormReturn<GenerationFormValues>;

// Merges a partial patch into the form's `params` object. Replaces the
// repeated `form.watch("params")` + spread + `form.setValue(... as never)`
// dance and keeps the one unavoidable cast contained here: `params` carries
// loosely-typed knobs (sampler/scheduler widen to string from descriptors).
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
