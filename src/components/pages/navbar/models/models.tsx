"use client";

import { PageHeader } from "@/components/elements/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModelsFilter } from "@/hooks/ui/use-models-hook";
import { FILTER_OPTIONS } from "@/store/models-store";
import { useTranslations } from "next-intl";
import { LuLayers, LuSearch, LuX } from "react-icons/lu";
import { SortFilter } from "./filters/sort-filter";
import { VendorFilter } from "./filters/vendor-filter";
import { ViewModeToggle } from "./filters/view-mode-toggle";
import { ModelCard } from "./model-card";
import { ModelDetailSheet } from "./model-detail-sheet";
import { ModelListItem } from "./model-list-item";

export function Models() {
  const t = useTranslations();
  const m = useModelsFilter();

  const priceLabels = {
    from: t("MODELS.PRICE_FROM"),
    perRequest: t("MODELS.PRICE_PER_REQUEST"),
    input: t("MODELS.PRICE_INPUT"),
    output: t("MODELS.PRICE_OUTPUT"),
    perMillion: t("MODELS.PRICE_PER_MILLION"),
    gridPricing: t("MODELS.PRICE_GRID"),
    customBilling: t("MODELS.PRICE_CUSTOM"),
  };

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

      {/* Filter Bar */}
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
              {t("MODELS.FILTER_RESET")}
              <LuX className="ml-1 h-4 w-4 md:ml-2" />
            </Button>
          )}
          <VendorFilter models={m.models} />
          <SortFilter />
          <ViewModeToggle />
        </div>
      </div>

      {/* Search + Type Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <LuSearch className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
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

      {/* Content */}
      {m.filtered.length === 0 ? (
        <div className="text-muted-foreground py-24 text-center">
          {t("MODELS.EMPTY")}
        </div>
      ) : m.viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {m.filtered.map((model) => (
            <ModelCard
              key={model.name}
              model={model}
              onClick={() => m.setSelectedModelName(model.name)}
              labels={priceLabels}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {m.filtered.map((model) => (
            <ModelListItem
              key={model.name}
              model={model}
              onClick={() => m.setSelectedModelName(model.name)}
              labels={priceLabels}
            />
          ))}
        </div>
      )}

      <ModelDetailSheet
        model={m.selectedModel}
        endpointMap={m.endpointMap}
        groupRatioMap={m.groupRatioMap}
        open={m.selectedModel !== null}
        onOpenChange={(open) => {
          if (!open) m.setSelectedModelName(null);
        }}
      />
    </div>
  );
}
