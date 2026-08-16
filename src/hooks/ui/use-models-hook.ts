"use client";

import type { ProcessedModel } from "@/lib/api/pricing";
import { matchesModality } from "@/lib/api/model-modality";
import type { RankedModel } from "@/openapi";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { useRankingsQuery } from "@/hooks/models/rankings-hook";
import { dayjs } from "@/lib/utils/format/date";
import {
  categoriesAtom,
  clearFiltersAtom,
  contextMinAtom,
  inputModalitiesAtom,
  maxAgeDaysAtom,
  outputModalityAtom,
  outputPriceMaxAtom,
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
import { analytics } from "@/lib/analytics";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";

export const NEW_MODEL_MS = 30 * 24 * 60 * 60 * 1000;

function effectivePrice(model: ProcessedModel): number {
  return model.isFixedPrice ? model.fixedPrice : model.inputPrice;
}

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
  const [outputPriceMax, setOutputPriceMax] = useAtom(outputPriceMaxAtom);
  const [maxAgeDays, setMaxAgeDays] = useAtom(maxAgeDaysAtom);
  const [series, setSeries] = useAtom(seriesAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [supportedParameters, setSupportedParameters] = useAtom(
    supportedParametersAtom,
  );
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
    outputPriceMax < PRICE_MAX ||
    maxAgeDays > 0;

  const query = search.trim().toLowerCase();
  const ageCutoff =
    maxAgeDays > 0 ? dayjs().valueOf() - maxAgeDays * 86_400_000 : 0;
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
    const matchesOutputPrice =
      outputPriceMax >= PRICE_MAX || model.outputPrice <= outputPriceMax;
    const ts = model.metadata.releaseTs;
    const matchesAge = ageCutoff === 0 || (ts > 0 && ts >= ageCutoff);
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
      matchesOutputPrice &&
      matchesAge &&
      matchesSeries &&
      matchesCategories &&
      matchesParams &&
      matchesTools
    );
  });

  let filtered = tabModels.filter((model) =>
    matchesModality(model, outputModality),
  );

  filtered = [...filtered].sort((a, b) => {
    if (sortOrder === "newest") {
      const diff = b.metadata.releaseTs - a.metadata.releaseTs;
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

  // Fire one models_searched when the query settles (not per keystroke).
  const trimmedQuery = search.trim();
  const resultCount = filtered.length;
  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    const id = setTimeout(() => {
      analytics.models.searched({
        query_length: trimmedQuery.length,
        has_results: resultCount > 0,
      });
    }, 800);
    return () => clearTimeout(id);
  }, [trimmedQuery, resultCount]);

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
    outputPriceMax,
    setOutputPriceMax,
    maxAgeDays,
    setMaxAgeDays,
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
