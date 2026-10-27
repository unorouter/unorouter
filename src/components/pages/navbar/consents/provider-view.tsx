"use client";

import { ModelsEmpty } from "@/components/pages/navbar/models/browse/models-empty";
import {
  ResetFiltersButton,
  SearchInput,
} from "@/components/pages/navbar/models/browse/models-toolbar";
import { SortMenu } from "@/components/pages/navbar/models/filters/sort-filter";
import {
  ViewModeButtons,
  type ViewMode,
} from "@/components/pages/navbar/models/filters/view-mode-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  useProviderConsentsQuery,
  useRevokeProviderConsentMutation,
} from "@/hooks/auth/provider-consent-hook";
import { msg } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import { ProviderConsentDialog } from "@/components/elements/model/provider-consent-panel";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ProviderList } from "./provider-list";
import { ProviderFilterSidebar } from "./provider-filter-sidebar";
import type { ProviderHandlers, ProviderSelection } from "./provider-parts";
import {
  isSelectable,
  PROVIDER_SORT_VALUES,
  type ProviderSort,
} from "./provider-rows";
import { useProviderFilters } from "./use-provider-filters";

const providerTableAtoms = createTableAtoms(DataTableId.PROVIDER_CONSENTS);

const SORT_LABEL = {
  activeFirst: msg("PROVIDER_CONSENT.SORT.ACTIVE_FIRST"),
  activeChannelsDesc: msg("PROVIDER_CONSENT.SORT.ACTIVE_CHANNELS_DESC"),
  activeModelsDesc: msg("PROVIDER_CONSENT.SORT.ACTIVE_MODELS_DESC"),
  activeLanesDesc: msg("PROVIDER_CONSENT.SORT.ACTIVE_LANES_DESC"),
  modelsDesc: msg("PROVIDER_CONSENT.SORT.MODELS_DESC"),
  name: msg("PROVIDER_CONSENT.SORT.NAME"),
  country: msg("PROVIDER_CONSENT.SORT.COUNTRY"),
} satisfies Record<ProviderSort, ReturnType<typeof msg>>;

export function ProviderView(props: {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpen: (alias: string) => void;
}) {
  const t = useTranslations();
  const providersQuery = useProviderConsentsQuery();
  const revokeMutation = useRevokeProviderConsentMutation();
  const providers = providersQuery.data?.providers ?? [];
  const filters = useProviderFilters(providers);
  const params = filters.params;
  const columnSorting = useAtomValue(providerTableAtoms.sortingAtom);
  const setColumnSorting = useSetAtom(providerTableAtoms.sortingAtom);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // Frozen while the dialog is open, so a refetch cannot change the text shown.
  const [granting, setGranting] = useState<string[] | null>(null);

  // A provider granted elsewhere or filtered out no longer counts.
  const missingAliases = filters.filtered
    .filter(isSelectable)
    .map((p) => p.alias);
  const chosen = missingAliases.filter((alias) => selected.has(alias));
  const selection: ProviderSelection = {
    selected,
    toggle: (alias, on) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (on) next.add(alias);
        else next.delete(alias);
        return next;
      }),
    all: chosen.length > 0 && chosen.length === missingAliases.length,
    setAll: (on) => setSelected(new Set(on ? missingAliases : [])),
  };
  function grantAllMissing() {
    setSelected(new Set(missingAliases));
    setGranting(missingAliases);
  }

  const handlers: ProviderHandlers = {
    open: props.onOpen,
    revoke: (alias) =>
      revokeMutation.mutate(
        { body: { alias } },
        {
          onSuccess: () => toast.success(t("CONSENT.REVOKED")),
          onError: (error) => toast.error(error.message),
        },
      ),
    revoking: revokeMutation.isPending,
  };

  const showReset =
    filters.activeFilterCount > 0 ||
    params.porder.length > 0 ||
    columnSorting.length > 0;
  function resetAll() {
    filters.reset();
    setColumnSorting([]);
  }
  const search = (className: string) => (
    <SearchInput
      className={className}
      placeholder={t("PROVIDER_CONSENT.SEARCH")}
      value={params.pq}
      onChange={(pq) => void filters.setParams({ pq: pq || null })}
    />
  );

  return (
    <SidebarProvider
      defaultOpen
      className="relative h-auto min-h-0 overflow-visible"
    >
      <ProviderFilterSidebar providers={providers} filters={filters} />
      <SidebarInset className="@container max-h-none! min-w-0 overflow-visible bg-transparent px-4 md:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SidebarTrigger
            aria-label={t("MODELS.FILTER.TITLE")}
            className="size-8 shrink-0 border"
          />
          {missingAliases.length > 0 && (
            <Button size="sm" onClick={grantAllMissing}>
              {t("PROVIDER_CONSENT.SELECT.GRANT_ALL_MISSING", {
                count: missingAliases.length,
              })}
            </Button>
          )}
          <div className="ml-auto flex flex-1 items-center justify-end gap-2">
            {showReset && (
              <ResetFiltersButton
                activeFilterCount={filters.activeFilterCount}
                onReset={resetAll}
              />
            )}
            {search("relative hidden w-full max-w-xs lg:block")}
            <SortMenu
              options={PROVIDER_SORT_VALUES}
              label={(key) => t(SORT_LABEL[key])}
              value={params.porder}
              active={filters.activeSort}
              onChange={(porder) => void filters.setParams({ porder })}
            />
            <ViewModeButtons value={props.view} onChange={props.onViewChange} />
          </div>
        </div>
        {search("relative mb-3 w-full lg:hidden")}
        <div className="min-h-svh">
          {!providersQuery.isLoading && filters.filtered.length === 0 ? (
            <ModelsEmpty
              filtered={showReset}
              count={filters.activeFilterCount}
              onReset={resetAll}
            />
          ) : (
            <ProviderList
              id={DataTableId.PROVIDER_CONSENTS}
              providers={filters.filtered}
              view={props.view}
              handlers={handlers}
              isLoading={providersQuery.isLoading}
              selection={selection}
            />
          )}
        </div>
        {chosen.length > 0 && (
          <div className="bg-overlay sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:-mx-6 md:px-6">
            <Button
              variant="outline"
              size="sm"
              aria-label={t("PROVIDER_CONSENT.SELECT.CLEAR")}
              onClick={() => setSelected(new Set())}
            >
              <Icon name="x" className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">
                {t("PROVIDER_CONSENT.SELECT.CLEAR")}
              </span>
            </Button>
            <Button
              size="sm"
              className="min-w-0 flex-1 sm:flex-none"
              onClick={() => setGranting(chosen)}
            >
              {t("PROVIDER_CONSENT.SELECT.GRANT_SELECTED", {
                count: chosen.length,
              })}
            </Button>
          </div>
        )}
        <ProviderConsentDialog
          open={granting !== null}
          aliases={granting ?? undefined}
          onClose={() => setGranting(null)}
          onGranted={() => setSelected(new Set())}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
