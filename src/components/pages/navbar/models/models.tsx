"use client";

import { PageHeader } from "@/components/elements/page-header";
import { VendorIcon } from "@/components/elements/vendor-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { FilterAll, ModelTypeFilter } from "@/lib/types/enums";
import { cn } from "@/lib/utils";
import {
  FILTER_OPTIONS,
  searchAtom,
  selectedModelNameAtom,
  typeFilterAtom,
  vendorFilterAtom,
} from "@/store/models-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { LuChevronDown, LuLayers, LuSearch } from "react-icons/lu";
import { ModelCard } from "./model-card";
import { ModelDetailSheet } from "./model-detail-sheet";

export function Models() {
  const t = useTranslations();
  const [search, setSearch] = useAtom(searchAtom);
  const [filter, setFilter] = useAtom(typeFilterAtom);
  const [vendorFilter, setVendorFilter] = useAtom(vendorFilterAtom);
  const [selectedModelName, setSelectedModelName] = useAtom(
    selectedModelNameAtom,
  );

  const { data } = usePricingQuery();
  const models = data?.models ?? [];
  const endpointMap = data?.endpointMap ?? {};

  const vendorNames = [...new Set(models.map((m) => m.vendor.name))].sort(
    (a, b) => a.localeCompare(b),
  );

  const selectedModel =
    models.find((m) => m.name === selectedModelName) ?? null;

  const filtered = models.filter((model) => {
    const matchesSearch = model.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      filter === ModelTypeFilter.ALL || model.type === filter;
    const matchesVendor =
      vendorFilter === FilterAll.ALL || model.vendor.name === vendorFilter;
    return matchesSearch && matchesFilter && matchesVendor;
  });

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

      {/* Search and Filter */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <LuSearch className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("MODELS.SEARCH_PLACEHOLDER")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="border-input bg-background text-foreground ring-offset-background inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 font-mono text-xs focus:ring-2 focus:ring-offset-2 focus:outline-none">
              {vendorFilter !== FilterAll.ALL && (
                <VendorIcon vendor={vendorFilter} size={14} />
              )}
              <span>
                {vendorFilter === FilterAll.ALL
                  ? t("MODELS.FILTER_PROVIDER")
                  : vendorFilter}
              </span>
              <LuChevronDown className="text-muted-foreground h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={4}>
              <DropdownMenuItem
                className={cn(
                  "font-mono text-xs",
                  vendorFilter === FilterAll.ALL && "bg-accent",
                )}
                onClick={() => setVendorFilter(FilterAll.ALL)}
              >
                {t("MODELS.FILTER_PROVIDER")}
              </DropdownMenuItem>
              {vendorNames.map((name) => (
                <DropdownMenuItem
                  key={name}
                  className={cn(
                    "font-mono text-xs",
                    vendorFilter === name && "bg-accent",
                  )}
                  onClick={() => setVendorFilter(name)}
                >
                  <VendorIcon vendor={name} size={14} />
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex flex-wrap gap-1">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.key}
                variant={filter === option.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(option.key)}
                className="font-mono text-xs"
              >
                {t(option.labelKey)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Count */}
      <p className="text-muted-foreground mb-6 font-mono text-sm">
        {filtered.length} {t("MODELS.MODEL_COUNT")}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-muted-foreground py-24 text-center">
          {t("MODELS.EMPTY")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((model) => (
            <ModelCard
              key={model.name}
              model={model}
              onClick={() => setSelectedModelName(model.name)}
              labels={{
                from: t("MODELS.PRICE_FROM"),
                perRequest: t("MODELS.PRICE_PER_REQUEST"),
                input: t("MODELS.PRICE_INPUT"),
                output: t("MODELS.PRICE_OUTPUT"),
                perMillion: t("MODELS.PRICE_PER_MILLION"),
              }}
            />
          ))}
        </div>
      )}

      <ModelDetailSheet
        model={selectedModel}
        endpointMap={endpointMap}
        groupRatioMap={data?.groupRatioMap ?? {}}
        open={selectedModel !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedModelName(null);
        }}
      />
    </div>
  );
}
