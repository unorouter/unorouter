"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { viewModeAtom } from "@/store/models-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";

export function ViewModeToggle() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const t = useTranslations();

  return (
    <div className="border-border flex items-center gap-0.5 rounded-md border p-0.5 md:gap-1 md:p-1">
      <Button
        variant={viewMode === "table" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => setViewMode("table")}
        aria-label={t("MODELS.VIEW.TABLE")}
        aria-pressed={viewMode === "table"}
        title={t("MODELS.VIEW.TABLE")}
        className="h-6 w-6 md:h-7 md:w-7"
      >
        <Icon name="layout-dashboard" className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
      <Button
        variant={viewMode === "list" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => setViewMode("list")}
        aria-label={t("MODELS.VIEW.LIST")}
        aria-pressed={viewMode === "list"}
        title={t("MODELS.VIEW.LIST")}
        className="h-6 w-6 md:h-7 md:w-7"
      >
        <Icon name="list" className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
    </div>
  );
}
