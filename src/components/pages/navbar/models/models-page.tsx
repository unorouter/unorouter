"use client";

import { PageHeader } from "@/components/elements/content/page-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { usePerfMetricsSummaryQuery } from "@/hooks/models/perf-metrics-hook";
import { useModelsFilter } from "@/hooks/ui/use-models-hook";
import { FILTER_OPTIONS, selectedVendorsAtom } from "@/store/models-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { WindowVirtualizer } from "virtua";
import { ModelCard } from "./browse/model-card";
import { ModelListItem } from "./browse/model-list-item";
import { ModelDetailSheet } from "./detail/model-detail-sheet";
import { SortFilter } from "./filters/sort-filter";
import { VendorFilter } from "./filters/vendor-filter";
import { ViewModeToggle } from "./filters/view-mode-toggle";

// Fixed chunk size: each virtual row holds 3 cards and its own responsive
// grid reflows them (3/2/1 per breakpoint). JS column detection started at 1
// and corrected in an effect, flashing a one-column layout on every load.
const GRID_CHUNK = 3;
const GRID_SSR_ROWS = 8;
const LIST_SSR_ROWS = 12;

function Maybe(props: {
  virtualize: boolean;
  ssrCount: number;
  vKey: string;
  children: React.ReactNode;
}) {
  if (!props.virtualize) return <>{props.children}</>;
  return (
    <WindowVirtualizer key={props.vKey} ssrCount={props.ssrCount}>
      {props.children}
    </WindowVirtualizer>
  );
}

export function ModelsPage() {
  const t = useTranslations();
  const m = useModelsFilter();
  const perfQuery = usePerfMetricsSummaryQuery(24);
  const perfMap = new Map(
    (perfQuery.data?.models ?? []).map((row) => [row.model_name, row]),
  );

  // Rendering all ~200 catalog entries at once cost ~20s main-thread on mobile
  // (Lighthouse TBT 9.9s); window-virtualize like the status page.
  const gridRows: (typeof m.filtered)[] = [];
  for (let i = 0; i < m.filtered.length; i += GRID_CHUNK) {
    gridRows.push(m.filtered.slice(i, i + GRID_CHUNK));
  }

  const searchParams = useSearchParams();
  const [selectedVendors, setSelectedVendors] = useAtom(selectedVendorsAtom);
  useEffect(() => {
    const vendorParam = searchParams.get("vendor");
    if (vendorParam && selectedVendors.length === 0) {
      setSelectedVendors([vendorParam]);
    }
    // Only seed once on mount; ignore subsequent searchParams changes so the
    // user can clear the filter without it snapping back from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceLabels = {
    from: t("MODELS.PRICE.FROM"),
    perRequest: t("MODELS.PRICE.PER_REQUEST"),
    input: t("MODELS.PRICE.INPUT"),
    output: t("MODELS.PRICE.OUTPUT"),
    perMillion: t("MODELS.PRICE.PER_MILLION"),
    gridPricing: t("MODELS.PRICE.GRID"),
    customBilling: t("MODELS.PRICE.CUSTOM"),
    tiered: t("MODELS.PRICE.TIERED"),
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pt-24 pb-16">
      <PageHeader
        badge={t("MODELS.BADGE")}
        badgeIcon="layers"
        title={t("MODELS.TITLE")}
        subtitle={t("MODELS.SUBTITLE")}
        color="#22d3ee"
        centered
        className="mb-12"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 md:gap-4">
        <p className="text-muted-foreground font-mono text-sm">
          {m.filtered.length} {t("MODELS.MODEL_COUNT")}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          {m.hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={() => m.clearFilters()}
              className="h-8 px-2 md:h-9 lg:px-3"
            >
              {t("MODELS.FILTER.RESET")}
              <Icon name="x" className="ml-1 h-4 w-4 md:ml-2" />
            </Button>
          )}
          <VendorFilter models={m.models} />
          <SortFilter />
          <ViewModeToggle />
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
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
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.key}
              variant={m.filter === option.key ? "default" : "outline"}
              size="sm"
              onClick={() => m.setFilter(option.key)}
              className="font-mono text-xs"
            >
              {t(option.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      {m.filtered.length === 0 ? (
        <div className="text-muted-foreground py-24 text-center">
          {t("MODELS.EMPTY")}
        </div>
      ) : m.viewMode === "grid" ? (
        // ssrCount: server-render the first rows so LCP comes from HTML
        // instead of waiting for hydration + measurement.
        // virtua keeps the unclamped [0, ssrCount-1] range until first scroll,
        // so fewer children than ssrCount crashes (undefined.key); render small
        // lists plain. Maybe wraps both branches so the type switch unmounts
        // the virtualizer instead of reusing its store.
        <Maybe
          virtualize={gridRows.length > GRID_SSR_ROWS}
          ssrCount={GRID_SSR_ROWS}
          vKey="grid"
        >
          {gridRows.map((row) => (
            <div
              key={row[0].name}
              className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {row.map((model) => (
                <ModelCard
                  key={model.name}
                  model={model}
                  onClick={() => m.setSelectedModelName(model.name)}
                  labels={priceLabels}
                  perf={perfMap.get(model.name)}
                />
              ))}
            </div>
          ))}
        </Maybe>
      ) : (
        <Maybe
          virtualize={m.filtered.length > LIST_SSR_ROWS}
          ssrCount={LIST_SSR_ROWS}
          vKey="list"
        >
          {m.filtered.map((model) => (
            <div key={model.name} className="pb-2">
              <ModelListItem
                model={model}
                onClick={() => m.setSelectedModelName(model.name)}
                labels={priceLabels}
                perf={perfMap.get(model.name)}
              />
            </div>
          ))}
        </Maybe>
      )}

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
