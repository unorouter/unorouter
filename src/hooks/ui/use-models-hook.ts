"use client";

import { usePricingQuery } from "@/hooks/pricing-hook";
import { FilterAll, ModelTypeFilter } from "@/lib/types/enums";
import {
  searchAtom,
  selectedModelNameAtom,
  typeFilterAtom,
  vendorFilterAtom,
} from "@/store/models-store";
import { useAtom } from "jotai";

export function useModelsFilter() {
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

  return {
    search,
    setSearch,
    filter,
    setFilter,
    vendorFilter,
    setVendorFilter,
    selectedModel,
    setSelectedModelName,
    models,
    filtered,
    vendorNames,
    endpointMap,
    groupRatioMap: data?.groupRatioMap ?? {},
  };
}
