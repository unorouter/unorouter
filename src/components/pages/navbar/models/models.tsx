"use client";

import { PageHeader } from "@/components/elements/page-header";
import { useTranslations } from "next-intl";
import { LuLayers } from "react-icons/lu";
import { ModelsGrid } from "./models-grid";

export function Models() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-6xl px-6 pt-24 pb-16">
      <PageHeader
        badge={t("MODELS.BADGE")}
        badgeIcon={LuLayers}
        title={t("MODELS.TITLE")}
        subtitle={t("MODELS.SUBTITLE")}
        color="#22d3ee"
        centered
        className="mb-12"
      />
      <ModelsGrid />
    </div>
  );
}
