"use client";

import { usePricingQuery } from "@/hooks/pricing-hook";
import { ModelTypeFilter } from "@/lib/types/enums";
import {
  clearFiltersAtom,
  searchAtom,
  selectedModelNameAtom,
  selectedVendorsAtom,
  sortOrderAtom,
  typeFilterAtom,
  viewModeAtom,
} from "@/store/models-store";
import { useAtom, useSetAtom } from "jotai";

export function useModelsFilter() {
  const { data } = usePricingQuery();

  const [search, setSearch] = useAtom(searchAtom);
  const [filter, setFilter] = useAtom(typeFilterAtom);
  const [selectedVendors, setSelectedVendors] = useAtom(selectedVendorsAtom);
  const [selectedModelName, setSelectedModelName] = useAtom(
    selectedModelNameAtom,
  );
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const clearFilters = useSetAtom(clearFiltersAtom);

  const models = data?.models ?? [];
  const endpointMap = data?.endpointMap ?? {};
  const vendorNames = data?.vendorNames ?? [];

  const selectedModel =
    models.find((m) => m.name === selectedModelName) ?? null;

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedVendors.length > 0 ||
    filter !== ModelTypeFilter.ALL ||
    sortOrder !== "name";

  let filtered = models.filter((model) => {
    const matchesSearch = model.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      filter === ModelTypeFilter.ALL || model.type === filter;
    const matchesVendor =
      selectedVendors.length === 0 ||
      selectedVendors.includes(model.vendor.name);
    return matchesSearch && matchesFilter && matchesVendor;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortOrder === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortOrder === "priceAsc") {
      const priceA = a.isFixedPrice ? a.fixedPrice : a.inputPrice;
      const priceB = b.isFixedPrice ? b.fixedPrice : b.inputPrice;
      return priceA - priceB;
    }
    // priceDesc
    const priceA = a.isFixedPrice ? a.fixedPrice : a.inputPrice;
    const priceB = b.isFixedPrice ? b.fixedPrice : b.inputPrice;
    return priceB - priceA;
  });

  return {
    search,
    setSearch,
    filter,
    setFilter,
    selectedVendors,
    setSelectedVendors,
    selectedModel,
    setSelectedModelName,
    viewMode,
    setViewMode,
    sortOrder,
    setSortOrder,
    clearFilters,
    hasActiveFilters,
    models,
    filtered,
    vendorNames,
    endpointMap,
    groupRatioMap: data?.groupRatioMap ?? {},
  };
}
