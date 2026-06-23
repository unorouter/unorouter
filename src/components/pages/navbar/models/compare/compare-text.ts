import type { ProcessedModel } from "@/lib/api/pricing";

// "<A> vs <B> vs <C>": shared by metadata title, breadcrumb crumb, and the H1.
export function comboTitle(models: ProcessedModel[]): string {
  return models.map((m) => m.name).join(" vs ");
}

// The model+vendor listing for the description; the surrounding sentence is i18n.
export function comboModelList(
  models: ProcessedModel[],
  fromWord: string,
): string {
  return models.map((m) => `${m.name} ${fromWord} ${m.vendor.name}`).join(", ");
}
