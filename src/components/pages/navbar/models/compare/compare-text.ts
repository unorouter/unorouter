import type { PricingCatalogModel } from "@/openapi";

export function comboTitle(models: PricingCatalogModel[]): string {
  return models.map((m) => m.model_name).join(" vs ");
}

export function comboModelList(
  models: PricingCatalogModel[],
  fromWord: string,
): string {
  return models
    .map((m) => `${m.model_name} ${fromWord} ${m.vendor}`)
    .join(", ");
}
