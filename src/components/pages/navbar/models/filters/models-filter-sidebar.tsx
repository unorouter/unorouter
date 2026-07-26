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
  maxAgeDaysAtom,
  outputPriceMaxAtom,
  priceRangeAtom,
  selectedVendorsAtom,
  seriesAtom,
  supportedParametersAtom,
  toolsOnlyAtom,
} from "@/store/models-store";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import {
  ContextGroup,
  InputModalitiesGroup,
  ModelAgeGroup,
  MultiSelectGroup,
  OutputPriceGroup,
  PriceGroup,
  ToolsGroup,
} from "./filter-groups";

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function ModelsFilterSidebar(props: { models: ProcessedModel[] }) {
  const t = useTranslations();

  const [inputModalities, setInputModalities] = useAtom(inputModalitiesAtom);
  const [contextMin, setContextMin] = useAtom(contextMinAtom);
  const [priceRange, setPriceRange] = useAtom(priceRangeAtom);
  const [outputPriceMax, setOutputPriceMax] = useAtom(outputPriceMaxAtom);
  const [maxAgeDays, setMaxAgeDays] = useAtom(maxAgeDaysAtom);
  const [series, setSeries] = useAtom(seriesAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [supportedParameters, setSupportedParameters] = useAtom(
    supportedParametersAtom,
  );
  const [selectedVendors, setSelectedVendors] = useAtom(selectedVendorsAtom);
  const [toolsOnly, setToolsOnly] = useAtom(toolsOnlyAtom);
  const isDirty = useAtomValue(isDirtyAtom);
  const clearFilters = useSetAtom(clearFiltersAtom);

  const seriesOptions = uniqueSorted(
    props.models
      .map((m) => m.metadata.series)
      .filter((s): s is string => Boolean(s)),
  );
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
    <Sidebar
      collapsible="offcanvas"
      className="absolute! inset-y-0 h-full! bg-transparent"
    >
      <div className="sticky top-14 flex max-h-[calc(100svh-3.5rem)] flex-col">
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
        <SidebarContent className="gap-4 overflow-y-auto px-3 py-2">
          <InputModalitiesGroup
            value={inputModalities}
            onChange={setInputModalities}
          />
          <ToolsGroup value={toolsOnly} onChange={setToolsOnly} />
          <ContextGroup value={contextMin} onChange={setContextMin} />
          <PriceGroup value={priceRange} onChange={setPriceRange} />
          <OutputPriceGroup
            value={outputPriceMax}
            onChange={setOutputPriceMax}
          />
          <ModelAgeGroup value={maxAgeDays} onChange={setMaxAgeDays} />
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
      </div>
    </Sidebar>
  );
}
