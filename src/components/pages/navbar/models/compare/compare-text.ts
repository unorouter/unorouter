import type { ProcessedModel } from "@/lib/api/pricing";

// "<A> vs <B> vs <C>" - shared by metadata title, breadcrumb crumb, and the H1.
export function comboTitle(models: ProcessedModel[]): string {
  return models.map((m) => m.name).join(" vs ");
}

// "Claude Fable 5 from Anthropic, GPT-5.5 from OpenAI, ..." - the model+vendor
// listing used in the description; the surrounding sentence is i18n (COMPARE.META.DESCRIPTION_COMBO).
export function comboModelList(
  models: ProcessedModel[],
  fromWord: string,
): string {
  return models.map((m) => `${m.name} ${fromWord} ${m.vendor.name}`).join(", ");
}
