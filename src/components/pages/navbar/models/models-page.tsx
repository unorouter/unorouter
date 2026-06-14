"use client";

import { PageHeader } from "@/components/elements/content/page-header";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useModelsFilter } from "@/hooks/ui/use-models-hook";
import { useModelsUrlSync } from "@/hooks/ui/use-models-url-sync";
import type { OutputModality } from "@/lib/api/model-modality";
import { useTranslations } from "next-intl";
import { ModelListCard } from "./browse/model-list-card";
import { ModelTableHeader } from "./browse/model-table-header";
import { ModelTableRow } from "./browse/model-table-row";
import { ModelDetailSheet } from "./detail/model-detail-sheet";
import { ModelsFilterSidebar } from "./filters/models-filter-sidebar";
import { ModalityTabs } from "./filters/modality-tabs";
import { SortFilter } from "./filters/sort-filter";
import { ViewModeToggle } from "./filters/view-mode-toggle";

export function ModelsPage() {
  const t = useTranslations();
  const m = useModelsFilter();
  useModelsUrlSync();

  return (
    <div className="w-full pt-20 pb-16">
      <div className="mx-auto max-w-7xl px-6">
        <PageHeader
          badge={t("MODELS.BADGE")}
          badgeIcon="layers"
          title={t("MODELS.TITLE")}
          subtitle={t("MODELS.SUBTITLE")}
          color="#22d3ee"
          centered
          className="mb-10"
        />
      </div>

      {/* Override the provider wrapper's `h-dvh overflow-hidden` (built for an
          app shell with its own inner scroll): this page window-scrolls, so the
          wrapper must flow in the document or the list gets clipped/unscrollable. */}
      <SidebarProvider
        defaultOpen
        className="h-auto min-h-0 overflow-visible"
        style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
      >
        <ModelsFilterSidebar
          models={m.models}
          inputModalities={m.inputModalities}
          setInputModalities={m.setInputModalities}
          contextMin={m.contextMin}
          setContextMin={m.setContextMin}
          priceRange={m.priceRange}
          setPriceRange={m.setPriceRange}
          categories={m.categories}
          setCategories={m.setCategories}
          supportedParameters={m.supportedParameters}
          setSupportedParameters={m.setSupportedParameters}
          selectedVendors={m.selectedVendors}
          setSelectedVendors={m.setSelectedVendors}
          hasActiveFilters={m.hasActiveFilters}
          onClear={m.clearFilters}
        />

        {/* Override the inset's own scroll container (max-h-dvh + overflow-auto):
            this page window-scrolls, so the inset must flow in the document for
            the sticky tab + table header to pin against the viewport. */}
        <SidebarInset className="max-h-none overflow-visible bg-transparent px-4 md:px-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="shrink-0" />
              <p className="text-muted-foreground font-mono text-sm">
                {m.filtered.length} {t("MODELS.MODEL_COUNT")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <SortFilter />
              <ViewModeToggle />
            </div>
          </div>

          <div className="relative mb-4">
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

          {/* Tabs + table header stick together as one unit under the navbar
              so the column labels stay flush below the tab row (no gap, no
              half-row peeking through). */}
          <div className="bg-background/95 supports-backdrop-blur:bg-background/80 sticky top-14 z-20 backdrop-blur">
            <ModalityTabs
              models={m.models}
              value={m.outputModality as OutputModality}
              onChange={(value) => m.setOutputModality(value)}
            />
            {m.viewMode === "table" && m.filtered.length > 0 && (
              <ModelTableHeader
                sortOrder={m.sortOrder}
                onSort={(sort) => m.setSortOrder(sort)}
              />
            )}
          </div>

          <div className="mt-4">
            {m.filtered.length === 0 ? (
              <div className="text-muted-foreground py-24 text-center">
                {t("MODELS.EMPTY")}
              </div>
            ) : m.viewMode === "table" ? (
              m.filtered.map((model) => (
                <ModelTableRow
                  key={model.name}
                  model={model}
                  rank={m.rankMap.get(model.name)}
                  onClick={() => m.setSelectedModelName(model.name)}
                />
              ))
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
