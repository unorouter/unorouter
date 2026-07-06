import type { ProcessedModel } from "@/lib/api/pricing";

export function comboTitle(models: ProcessedModel[]): string {
  return models.map((m) => m.name).join(" vs ");
}

export function comboModelList(
  models: ProcessedModel[],
  fromWord: string,
): string {
  return models.map((m) => `${m.name} ${fromWord} ${m.vendor.name}`).join(", ");
}
