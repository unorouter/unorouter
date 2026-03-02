"use client";

import { useTranslations } from "next-intl";
import { ModelsGrid } from "./models-grid";

export function Models() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold">{t("MODELS.TITLE")}</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          {t("MODELS.SUBTITLE")}
        </p>
      </div>

      <ModelsGrid />
    </div>
  );
}
