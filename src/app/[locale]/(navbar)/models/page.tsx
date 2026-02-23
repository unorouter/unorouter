import { getTranslations } from "next-intl/server";
import { fetchPricing, processModels, type ProcessedModel } from "@/lib/api/pricing";
import { ModelsGrid } from "@/components/pages/models/models-grid";

export default async function ModelsPage() {
  const t = await getTranslations("MODELS");

  let models: ProcessedModel[] = [];
  try {
    const pricing = await fetchPricing();
    models = processModels(pricing);
  } catch {
    // fallback to empty
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold">{t("TITLE")}</h1>
        <p className="text-muted-foreground mt-3 text-lg">{t("SUBTITLE")}</p>
      </div>

      <ModelsGrid models={models} />
    </div>
  );
}
