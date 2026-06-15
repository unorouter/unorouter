"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import type { ProcessedModel } from "@/lib/api/pricing";
import {
  categoriesAtom,
  clearFiltersAtom,
  contextMinAtom,
  inputModalitiesAtom,
  isDirtyAtom,
  priceRangeAtom,
  selectedVendorsAtom,
  seriesAtom,
  supportedParametersAtom,
} from "@/store/models-store";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import {
  ContextGroup,
  InputModalitiesGroup,
  MultiSelectGroup,
  PriceGroup,
} from "./filter-groups";

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

// Reads filter state straight from the models store; only models is passed since it comes from the pricing query, not the store.
export function ModelsFilterSidebar(props: { models: ProcessedModel[] }) {
  const t = useTranslations();

  const [inputModalities, setInputModalities] = useAtom(inputModalitiesAtom);
  const [contextMin, setContextMin] = useAtom(contextMinAtom);
  const [priceRange, setPriceRange] = useAtom(priceRangeAtom);
  const [series, setSeries] = useAtom(seriesAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [supportedParameters, setSupportedParameters] = useAtom(
    supportedParametersAtom,
  );
  const [selectedVendors, setSelectedVendors] = useAtom(selectedVendorsAtom);
  const isDirty = useAtomValue(isDirtyAtom);
  const clearFilters = useSetAtom(clearFiltersAtom);

  const seriesOptions = uniqueSorted(
    props.models
      .map((m) => m.metadata.series)
      .filter((s): s is string => Boolean(s)),
  );
  // Categories from synced metadata; fall back to tags (excluding the modality-type tag) when metadata is absent.
  const typeTags = new Set(["text", "image", "video", "audio", "embedding"]);
  const categoryOptions = uniqueSorted(
    props.models.flatMap((m) =>
      m.metadata.categories && m.metadata.categories.length > 0
        ? m.metadata.categories
        : m.tags.filter((tag) => !typeTags.has(tag.toLowerCase())),
    ),
  );
  const paramOptions = uniqueSorted(
    props.models.flatMap((m) => m.metadata.supportedParametersAll ?? []),
  );
  const vendorOptions = uniqueSorted(props.models.map((m) => m.vendor.name));

  return (
    <Sidebar collapsible="offcanvas" className="top-14 bottom-0 h-auto">
      <SidebarHeader className="flex-row items-center justify-between px-3 py-2">
        <span className="font-mono text-sm font-medium">
          {t("MODELS.FILTER.TITLE")}
        </span>
        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearFilters()}
            className="h-7 px-2"
          >
            {t("MODELS.FILTER.RESET")}
            <Icon name="x" className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent className="gap-4 px-3 py-2">
        <InputModalitiesGroup
          value={inputModalities}
          onChange={setInputModalities}
        />
        <ContextGroup value={contextMin} onChange={setContextMin} />
        <PriceGroup value={priceRange} onChange={setPriceRange} />
        <MultiSelectGroup
          label={t("MODELS.FILTER.SERIES")}
          options={seriesOptions}
          value={series}
          onChange={setSeries}
        />
        <MultiSelectGroup
          label={t("MODELS.FILTER.CATEGORIES")}
          options={categoryOptions}
          value={categories}
          onChange={setCategories}
        />
        <MultiSelectGroup
          label={t("MODELS.FILTER.SUPPORTED_PARAMETERS")}
          options={paramOptions}
          value={supportedParameters}
          onChange={setSupportedParameters}
        />
        <MultiSelectGroup
          label={t("MODELS.FILTER.PROVIDERS")}
          options={vendorOptions}
          value={selectedVendors}
          onChange={setSelectedVendors}
        />
      </SidebarContent>
    </Sidebar>
  );
}
