"use client";

import type { ProcessedModel } from "@/lib/api/pricing";
import { deriveOutputModality } from "@/lib/api/model-modality";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { useRankingsQuery } from "@/hooks/models/rankings-hook";
import { dayjs } from "@/lib/utils/format/date";
import {
  categoriesAtom,
  clearFiltersAtom,
  contextMinAtom,
  inputModalitiesAtom,
  outputModalityAtom,
  PRICE_MAX,
  priceRangeAtom,
  searchAtom,
  selectedModelNameAtom,
  selectedVendorsAtom,
  seriesAtom,
  sortOrderAtom,
  supportedParametersAtom,
  toolsOnlyAtom,
  viewModeAtom,
} from "@/store/models-store";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

// Release timestamp (ms) for Newest sort + Released column: OpenRouter launch date first, new-api insert date fallback.
export function modelReleaseTs(model: ProcessedModel): number {
  const iso = model.metadata.releaseDate;
  if (iso) {
    const ms = dayjs(iso).valueOf();
    if (Number.isFinite(ms)) return ms;
  }
  if (model.createdTime) return model.createdTime * 1000;
  return 0;
}

function effectivePrice(model: ProcessedModel): number {
  return model.isFixedPrice ? model.fixedPrice : model.inputPrice;
}

// "free" in every supported locale, so searching the localized word surfaces free models regardless of UI language.
const FREE_KEYWORDS = [
  "free",
  "gratis",
  "gratuit",
  "grátis",
  "مجاني",
  "חינם",
  "मुफ़्त",
  "無料",
  "무료",
  "za darmo",
  "бесплатно",
  "ücretsiz",
  "miễn phí",
  "免费",
  "免費",
];

function matchesFreeKeyword(query: string): boolean {
  if (query.length < 2) return false;
  return FREE_KEYWORDS.some((word) => word.toLowerCase().includes(query));
}

export function useModelsFilter() {
  const { data } = usePricingQuery();
  const rankings = useRankingsQuery("week");

  const [search, setSearch] = useAtom(searchAtom);
  const [outputModality, setOutputModality] = useAtom(outputModalityAtom);
  const [selectedVendors, setSelectedVendors] = useAtom(selectedVendorsAtom);
  const [selectedModelName, setSelectedModelName] = useAtom(
    selectedModelNameAtom,
  );
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const [inputModalities, setInputModalities] = useAtom(inputModalitiesAtom);
  const [contextMin, setContextMin] = useAtom(contextMinAtom);
  const [priceRange, setPriceRange] = useAtom(priceRangeAtom);
  const [series, setSeries] = useAtom(seriesAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [supportedParameters, setSupportedParameters] = useAtom(
    supportedParametersAtom,
  );
  // Read-only here; the sidebar writes toolsOnlyAtom directly.
  const toolsOnly = useAtomValue(toolsOnlyAtom);
  const clearFilters = useSetAtom(clearFiltersAtom);

  const models = data?.models ?? [];
  const endpointMap = data?.endpointMap ?? {};
  const vendorNames = data?.vendorNames ?? [];

  const rankMap = new Map<string, RankedModel>(
    (rankings.data?.models ?? []).map((row) => [row.model_name, row]),
  );

  const selectedModel =
    models.find((m) => m.name === selectedModelName) ?? null;

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedVendors.length > 0 ||
    inputModalities.length > 0 ||
    series.length > 0 ||
    categories.length > 0 ||
    supportedParameters.length > 0 ||
    toolsOnly ||
    contextMin > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < PRICE_MAX ||
    sortOrder !== "newest";

  const query = search.trim().toLowerCase();
  // Every filter EXCEPT the modality tab: the tab counts must reflect the active
  // sidebar filters (each count = what that tab would show if clicked).
  const tabModels = models.filter((model) => {
    const matchesSearch =
      query.length === 0 ||
      model.name.toLowerCase().includes(query) ||
      model.vendor.name.toLowerCase().includes(query) ||
      (model.isFree && matchesFreeKeyword(query));
    const matchesVendor =
      selectedVendors.length === 0 ||
      selectedVendors.includes(model.vendor.name);
    const modelInputs = model.metadata.inputModalities ?? [];
    const matchesInputModalities =
      inputModalities.length === 0 ||
      inputModalities.every((mod) => modelInputs.includes(mod));
    const ctx =
      model.metadata.contextWindow ?? model.metadata.maxInputTokens ?? 0;
    const matchesContext = contextMin === 0 || ctx >= contextMin;
    const price = effectivePrice(model);
    const matchesPrice =
      price >= priceRange[0] &&
      (priceRange[1] >= PRICE_MAX || price <= priceRange[1]);
    // Categories from synced metadata (OpenRouter cards); fall back to tags.
    const modelCats = model.metadata.categories ?? model.tags;
    const matchesCategories =
      categories.length === 0 || categories.some((c) => modelCats.includes(c));
    const matchesSeries =
      series.length === 0 ||
      (model.metadata.series ? series.includes(model.metadata.series) : false);
    const modelParams = model.metadata.supportedParametersAll ?? [];
    const matchesParams =
      supportedParameters.length === 0 ||
      supportedParameters.every((p) => modelParams.includes(p));
    const matchesTools = !toolsOnly || model.metadata.supportsTools === true;
    return (
      matchesSearch &&
      matchesVendor &&
      matchesInputModalities &&
      matchesContext &&
      matchesPrice &&
      matchesSeries &&
      matchesCategories &&
      matchesParams &&
      matchesTools
    );
  });

  let filtered = tabModels.filter(
    (model) => deriveOutputModality(model) === outputModality,
  );

  filtered = [...filtered].sort((a, b) => {
    if (sortOrder === "newest") {
      const diff = modelReleaseTs(b) - modelReleaseTs(a);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    }
    if (sortOrder === "popular") {
      const ra = rankMap.get(a.name)?.rank ?? Number.POSITIVE_INFINITY;
      const rb = rankMap.get(b.name)?.rank ?? Number.POSITIVE_INFINITY;
      return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
    }
    if (sortOrder === "topWeekly") {
      const ta = rankMap.get(a.name)?.total_tokens ?? 0;
      const tb = rankMap.get(b.name)?.total_tokens ?? 0;
      return tb - ta;
    }
    if (sortOrder === "contextDesc") {
      const ca = a.metadata.contextWindow ?? a.metadata.maxInputTokens ?? 0;
      const cb = b.metadata.contextWindow ?? b.metadata.maxInputTokens ?? 0;
      return cb - ca;
    }
    if (sortOrder === "priceAsc") {
      return effectivePrice(a) - effectivePrice(b);
    }
    if (sortOrder === "priceDesc") {
      return effectivePrice(b) - effectivePrice(a);
    }
    return a.name.localeCompare(b.name);
  });

  return {
    search,
    setSearch,
    outputModality,
    setOutputModality,
    selectedVendors,
    setSelectedVendors,
    selectedModel,
    setSelectedModelName,
    viewMode,
    setViewMode,
    sortOrder,
    setSortOrder,
    inputModalities,
    setInputModalities,
    contextMin,
    setContextMin,
    priceRange,
    setPriceRange,
    series,
    setSeries,
    categories,
    setCategories,
    supportedParameters,
    setSupportedParameters,
    clearFilters,
    hasActiveFilters,
    models,
    tabModels,
    filtered,
    rankMap,
    vendorNames,
    endpointMap,
    groupRatioMap: data?.groupRatioMap ?? {},
    autoGroups: data?.autoGroups ?? [],
  };
}
