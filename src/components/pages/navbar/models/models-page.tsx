"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useModelsFilter } from "@/hooks/ui/use-models-hook";
import { ModelsUrlSync } from "@/hooks/ui/use-models-url-sync";
import { Link } from "@/i18n/navigation";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import { clearFiltersAtom, isDirtyAtom } from "@/store/models-store";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";
import { buildModelColumns } from "./browse/model-columns";
import { ModelListCard } from "./browse/model-list-card";

// Static import chained recharts (PerformanceSection) into the initial
// models bundle; the sheet only renders after a row click.
const ModelDetailSheet = dynamic(
  () =>
    import("./detail/model-detail-sheet").then((m) => ({
      default: m.ModelDetailSheet,
    })),
  { ssr: false },
);
import { ModalityTabs } from "./filters/modality-tabs";
import { ModelsFilterSidebar } from "./filters/models-filter-sidebar";
import { SortFilter } from "./filters/sort-filter";
import { ViewModeToggle } from "./filters/view-mode-toggle";

const modelsTableAtoms = createTableAtoms(DataTableId.MODELS);

export function ModelsPage() {
  const t = useTranslations();
  const m = useModelsFilter();

  // The hydrated list comes from a prerendered shell (up to ~1min stale) and
  // staleTime "static" never refetches it; pull a fresh copy once the page
  // is idle so newly added models appear without waiting for revalidation.
  const queryClient = useQueryClient();
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const handle = idle(() => {
      void queryClient.fetchQuery({
        queryKey: queryKeys.pricing(),
        queryFn: async () => handleElysia(await rpc.api.models.pricing.get()),
        staleTime: 0,
      });
    });
    return () => cancel(handle as number);
  }, [queryClient]);

  const clearFilters = useSetAtom(clearFiltersAtom);
  const isDirty = useAtomValue(isDirtyAtom);
  const columnSorting = useAtomValue(modelsTableAtoms.sortingAtom);
  const setColumnSorting = useSetAtom(modelsTableAtoms.sortingAtom);
  const showReset = isDirty || columnSorting.length > 0;

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
      <Suspense>
        <ModelsUrlSync />
      </Suspense>
      <SidebarProvider
        defaultOpen
        className="h-auto min-h-0 overflow-visible"
        style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
      >
        <ModelsFilterSidebar models={m.models} />

        <SidebarInset className="max-h-none overflow-visible bg-transparent px-4 md:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h1 className="mr-2 text-lg font-semibold tracking-tight">
              {t("MODELS.TITLE")}
            </h1>
            <p className="text-muted-foreground sr-only">
              {t("MODELS.SUBTITLE")}
            </p>
            <div className="ml-auto flex flex-1 items-center justify-end gap-2">
              {showReset && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="h-9 px-2 lg:px-3"
                >
                  {t("MODELS.FILTER.RESET")}
                  <Icon name="x" className="ml-1 h-4 w-4" />
                </Button>
              )}
              <div className="relative hidden w-full max-w-xs lg:block">
                <Icon
                  name="search"
                  className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                />
                <Input
                  placeholder={t("MODELS.SEARCH_PLACEHOLDER")}
                  value={m.search}
                  onChange={(e) => m.setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/compare" />}
                className="h-9 px-2 lg:px-3"
                aria-label={t("MODELS.COMPARE.BADGE")}
              >
                <Icon name="chart-column" className="h-4 w-4 lg:mr-1.5" />
                <span className="hidden lg:inline">
                  {t("MODELS.COMPARE.BADGE")}
                </span>
              </Button>
              <SortFilter />
              <ViewModeToggle />
            </div>
          </div>

          {/* Tabs + table header stick together as one unit under the navbar
              so the column labels stay flush below the tab row (no gap, no
              half-row peeking through). */}
          {/* h pinned: a transient hydration reflow inside the tab strip
              briefly grew this row 24px and shifted everything below (CLS). */}
          <div className="bg-background/95 supports-backdrop-blur:bg-background/80 sticky top-14 z-20 h-9.75 overflow-hidden backdrop-blur">
            <ModalityTabs
              models={m.tabModels}
              value={m.outputModality}
              onChange={(value) => m.setOutputModality(value)}
            />
          </div>

          <div className="relative mt-3 w-full lg:hidden">
            <Icon
              name="search"
              className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            />
            <Input
              placeholder={t("MODELS.SEARCH_PLACEHOLDER")}
              value={m.search}
              onChange={(e) => m.setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* min-h reserves the virtualized table's space pre-hydration; the
              window virtualizer renders no rows at SSR, so without it the
              footer starts in-viewport and hydration shoves it down (CLS). */}
          <div className="mt-4 min-h-svh">
            {m.filtered.length === 0 ? (
              <div className="text-muted-foreground py-24 text-center">
                {t("MODELS.EMPTY")}
              </div>
            ) : m.viewMode === "table" ? (
              <DataTable
                id={DataTableId.MODELS}
                data={m.filtered}
                columns={columns}
                localSorting
                windowVirtual
                onRowClick={(model) => m.setSelectedModelName(model.name)}
              />
            ) : (
              m.filtered.map((model) => (
                <ModelListCard
                  key={model.name}
                  model={model}
                  rank={m.rankMap.get(model.name)}
                  onClick={() => m.setSelectedModelName(model.name)}
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
