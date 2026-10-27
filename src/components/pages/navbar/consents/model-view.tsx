"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { ModelsEmpty } from "@/components/pages/navbar/models/browse/models-empty";
import {
  ResetFiltersButton,
  SearchInput,
} from "@/components/pages/navbar/models/browse/models-toolbar";
import { ModalityTabs } from "@/components/pages/navbar/models/filters/modality-tabs";
import { ModelSortMenu } from "@/components/pages/navbar/models/filters/sort-filter";
import {
  ViewModeButtons,
  type ViewMode,
} from "@/components/pages/navbar/models/filters/view-mode-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useProviderConsentsQuery } from "@/hooks/auth/provider-consent-hook";
import { useConsentModelsQuery } from "@/hooks/models/pricing-hook";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { KIND_LABEL } from "./consent-action";
import { buildConsentColumns } from "./consent-columns";
import { ConsentFilterSidebar } from "./consent-filter-sidebar";
import { ConsentModelCard } from "./consent-model-card";
import { buildConsentRows } from "./consent-rows";
import { useConsentFilters } from "./use-consent-filters";

const consentTableAtoms = createTableAtoms(DataTableId.FREE_MODELS);

export function ModelView(props: {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpen: (model: string) => void;
}) {
  const t = useTranslations();
  const consentModelsQuery = useConsentModelsQuery();
  const providersQuery = useProviderConsentsQuery();

  const rows = buildConsentRows(
    consentModelsQuery.data ?? [],
    providersQuery.data?.providers ?? [],
  );
  const filters = useConsentFilters(rows);
  const params = filters.params;
  const columnSorting = useAtomValue(consentTableAtoms.sortingAtom);
  const setColumnSorting = useSetAtom(consentTableAtoms.sortingAtom);

  const columns = buildConsentColumns({
    onOpen: props.onOpen,
    kindLabel: (row) => t(KIND_LABEL[row.kind]),
    offlineLabel: t("FREE_CONSENT.OFFLINE"),
    freeLabel: t("MODELS.TABLE.FREE"),
    flatNoParamsLabel: t("MODELS.TABLE.FLAT_NO_PARAMS"),
  });

  const loading = consentModelsQuery.isLoading || providersQuery.isLoading;
  const showReset =
    filters.activeFilterCount > 0 ||
    params.order.length > 0 ||
    columnSorting.length > 0;

  function resetAll() {
    filters.reset();
    setColumnSorting([]);
  }
  const search = (className: string) => (
    <SearchInput
      className={className}
      placeholder={t("FREE_CONSENT.SEARCH")}
      value={params.q}
      onChange={(q) => void filters.setParams({ q: q || null })}
    />
  );

  return (
    <SidebarProvider
      defaultOpen
      className="relative h-auto min-h-0 overflow-visible"
    >
      <ConsentFilterSidebar rows={rows} filters={filters} />

      <SidebarInset className="@container max-h-none! min-w-0 overflow-visible bg-transparent px-4 md:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="ml-auto flex flex-1 items-center justify-end gap-2">
            {showReset && (
              <ResetFiltersButton
                activeFilterCount={filters.activeFilterCount}
                onReset={resetAll}
              />
            )}
            {search("relative hidden w-full max-w-xs lg:block")}
            <ModelSortMenu
              value={params.order}
              active={filters.activeSort}
              onChange={(order) => void filters.setParams({ order })}
            />
            <ViewModeButtons value={props.view} onChange={props.onViewChange} />
          </div>
        </div>

        <div className="scroll-surface sticky top-14 z-20 flex h-9.75 items-center gap-2 overflow-hidden">
          <SidebarTrigger
            aria-label={t("MODELS.FILTER.TITLE")}
            className="size-8 shrink-0 border"
          />
          <ModalityTabs
            models={filters.tabRows.map((row) => row.model)}
            value={params.modality}
            onChange={(modality) => void filters.setParams({ modality })}
          />
        </div>

        {search("relative mt-3 w-full lg:hidden")}

        <div className="mt-4 min-h-svh">
          {!loading && filters.filtered.length === 0 ? (
            <ModelsEmpty
              filtered={showReset}
              count={filters.activeFilterCount}
              onReset={resetAll}
            />
          ) : props.view === "table" ? (
            <DataTable
              id={DataTableId.FREE_MODELS}
              data={filters.filtered}
              columns={columns}
              localSorting
              windowVirtual
              isLoading={loading}
              stickyHeaderTop="calc(3.5rem + 2.4375rem)"
            />
          ) : (
            filters.filtered.map((row) => (
              <ConsentModelCard
                key={row.model.model_name}
                row={row}
                onOpen={props.onOpen}
              />
            ))
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
