"use client";

import { DataTable } from "@/components/elements/table/data-table";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useModelsFilter } from "@/hooks/ui/use-models-hook";
import { ModelsUrlSync } from "@/hooks/ui/use-models-url-sync";
import { analytics } from "@/lib/analytics";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import {
  activeFilterCountAtom,
  clearFiltersAtom,
  isDirtyAtom,
} from "@/store/models-store";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { buildModelColumns } from "./browse/model-columns";
import { ModelListCard } from "./browse/model-list-card";
import { ModelsEmpty } from "./browse/models-empty";
import { ModelsToolbar, SearchBox } from "./browse/models-toolbar";
import { ModalityTabs } from "./filters/modality-tabs";
import { ModelsFilterSidebar } from "./filters/models-filter-sidebar";

// Static import chained recharts (PerformanceSection) into the initial models
// bundle; the sheet only renders after a row click.
const ModelDetailSheet = dynamic(
  () =>
    import("./detail/model-detail-sheet").then((m) => ({
      default: m.ModelDetailSheet,
    })),
  { ssr: false },
);

const modelsTableAtoms = createTableAtoms(DataTableId.MODELS);

export function ModelsPage() {
  const t = useTranslations();
  const m = useModelsFilter();
  const clearFilters = useSetAtom(clearFiltersAtom);
  const isDirty = useAtomValue(isDirtyAtom);
  const activeFilterCount = useAtomValue(activeFilterCountAtom);
  const columnSorting = useAtomValue(modelsTableAtoms.sortingAtom);
  const setColumnSorting = useSetAtom(modelsTableAtoms.sortingAtom);
  const showReset = isDirty || columnSorting.length > 0;

  const openDetail = (name: string) => {
    analytics.models.detailOpened({ model: name });
    m.setSelectedModelName(name);
  };

  function resetAll() {
    clearFilters();
    setColumnSorting([]);
  }

  const columns = buildModelColumns({
    rankMap: m.rankMap,
    offLabel: (pct) => t("MODELS.TABLE.OFF", { pct }),
    freeLabel: t("MODELS.TABLE.FREE"),
    flatNoParamsLabel: t("MODELS.TABLE.FLAT_NO_PARAMS"),
  });

  return (
    <div className="w-full pt-20 pb-16">
      <ModelsUrlSync />
      <SidebarProvider
        defaultOpen
        className="relative h-auto min-h-0 overflow-visible"
        style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
      >
        <ModelsFilterSidebar models={m.models} />

        <SidebarInset className="@container max-h-none! min-w-0 overflow-visible bg-transparent px-4 md:px-6">
          <ModelsToolbar
            showReset={showReset}
            activeFilterCount={activeFilterCount}
            onReset={resetAll}
          />

          {/* Tabs + table header stick together as one unit under the navbar
              so the column labels stay flush below the tab row. h pinned: a
              transient hydration reflow inside the tab strip briefly grew this
              row 24px and shifted everything below (CLS). */}
          <div className="bg-background sticky top-14 z-20 flex h-9.75 items-center gap-2 overflow-hidden">
            <SidebarTrigger
              aria-label={t("MODELS.FILTER.TITLE")}
              className="size-8 shrink-0 border"
            />
            <ModalityTabs
              models={m.tabModels}
              value={m.outputModality}
              onChange={(value) => m.setOutputModality(value)}
            />
          </div>

          <SearchBox className="relative mt-3 w-full lg:hidden" />

          {/* min-h reserves the virtualized table's space pre-hydration; the
              window virtualizer renders no rows at SSR, so without it the
              footer starts in-viewport and hydration shoves it down (CLS). */}
          <div className="mt-4 min-h-svh">
            {m.filtered.length === 0 ? (
              <ModelsEmpty
                filtered={showReset}
                count={activeFilterCount}
                onReset={resetAll}
              />
            ) : m.viewMode === "table" ? (
              <DataTable
                id={DataTableId.MODELS}
                data={m.filtered}
                columns={columns}
                localSorting
                windowVirtual
                onRowClick={(model) => openDetail(model.name)}
              />
            ) : (
              m.filtered.map((model) => (
                <ModelListCard
                  key={model.name}
                  model={model}
                  rank={m.rankMap.get(model.name)}
                  onClick={() => openDetail(model.name)}
                />
              ))
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>

      <ModelDetailSheet
        model={m.selectedModel}
        endpointMap={m.endpointMap}
        groupRatioMap={m.groupRatioMap}
        autoGroups={m.autoGroups}
        open={m.selectedModel !== null}
        onOpenChange={(open) => {
          if (!open) m.setSelectedModelName(null);
        }}
      />
    </div>
  );
}
