"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import type { ProcessedModel } from "@/lib/api/pricing";
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

export function ModelsFilterSidebar(props: {
  models: ProcessedModel[];
  inputModalities: string[];
  setInputModalities: (v: string[]) => void;
  contextMin: number;
  setContextMin: (v: number) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  categories: string[];
  setCategories: (v: string[]) => void;
  supportedParameters: string[];
  setSupportedParameters: (v: string[]) => void;
  selectedVendors: string[];
  setSelectedVendors: (v: string[]) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  const t = useTranslations();

  // Category options come from model tags (excluding the modality-type tag).
  const typeTags = new Set(["text", "image", "video", "audio", "embedding"]);
  const categoryOptions = uniqueSorted(
    props.models.flatMap((m) =>
      m.tags.filter((tag) => !typeTags.has(tag.toLowerCase())),
    ),
  );
  const paramOptions = uniqueSorted(
    props.models.flatMap((m) => m.metadata.supportedParametersAll ?? []),
  );
  const vendorOptions = uniqueSorted(props.models.map((m) => m.vendor.name));

  return (
    <Sidebar
      collapsible="offcanvas"
      className="top-14 bottom-0 h-auto"
    >
      <SidebarHeader className="flex-row items-center justify-between px-3 py-2">
        <span className="font-mono text-sm font-medium">
          {t("MODELS.FILTER.TITLE")}
        </span>
        {props.hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onClear}
            className="h-7 px-2"
          >
            {t("MODELS.FILTER.RESET")}
            <Icon name="x" className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <InputModalitiesGroup
          value={props.inputModalities}
          onChange={props.setInputModalities}
        />
        <ContextGroup value={props.contextMin} onChange={props.setContextMin} />
        <PriceGroup value={props.priceRange} onChange={props.setPriceRange} />
        <MultiSelectGroup
          label={t("MODELS.FILTER.CATEGORIES")}
          options={categoryOptions}
          value={props.categories}
          onChange={props.setCategories}
        />
        <MultiSelectGroup
          label={t("MODELS.FILTER.SUPPORTED_PARAMETERS")}
          options={paramOptions}
          value={props.supportedParameters}
          onChange={props.setSupportedParameters}
        />
        <MultiSelectGroup
          label={t("MODELS.FILTER.PROVIDERS")}
          options={vendorOptions}
          value={props.selectedVendors}
          onChange={props.setSelectedVendors}
        />
      </SidebarContent>
    </Sidebar>
  );
}
