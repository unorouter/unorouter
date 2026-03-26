"use client";

import { Button } from "@/components/ui/button";
import { type ViewMode, viewModeAtom } from "@/store/models-store";
import { useAtom } from "jotai";
import { LayoutGrid, List } from "lucide-react";
import { useTranslations } from "next-intl";

export function ViewModeToggle() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const t = useTranslations();

  const handleChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div className="border-border flex items-center gap-0.5 rounded-md border p-0.5 md:gap-1 md:p-1">
      <Button
        variant={viewMode === "grid" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => handleChange("grid")}
        aria-label={t("MODELS.VIEW_GRID")}
        aria-pressed={viewMode === "grid"}
        title={t("MODELS.VIEW_GRID")}
        className="h-6 w-6 md:h-7 md:w-7"
      >
        <LayoutGrid className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
      <Button
        variant={viewMode === "list" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => handleChange("list")}
        aria-label={t("MODELS.VIEW_LIST")}
        aria-pressed={viewMode === "list"}
        title={t("MODELS.VIEW_LIST")}
        className="h-6 w-6 md:h-7 md:w-7"
      >
        <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
    </div>
  );
}
