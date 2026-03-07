"use client";

import { useTranslations } from "next-intl";
import { LuLayers } from "react-icons/lu";
import { ModelsGrid } from "./models-grid";

export function Models() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5">
          <LuLayers className="h-3 w-3 text-cyan-400" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-400 uppercase">
            {t("MODELS.BADGE")}
          </span>
        </div>
        <h1 className="text-4xl font-bold tracking-tighter">
          {t("MODELS.TITLE")}
        </h1>
        <p className="text-muted-foreground mt-3 font-mono text-sm leading-relaxed">
          {t("MODELS.SUBTITLE")}
        </p>
      </div>

      <ModelsGrid />
    </div>
  );
}
