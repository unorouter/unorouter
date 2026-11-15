"use client";

import { matchesModality } from "@/lib/api/model-modality";
import type { RankedModel } from "@/openapi";
import { usePricingBrowseQuery } from "@/hooks/models/pricing-hook";
import { useRankingsQuery } from "@/hooks/models/rankings-hook";
import { dayjs } from "@/lib/utils/format/date";
import { effectivePrice, sortModels } from "@/lib/api/model-sort";
import { bestDiscountPercent } from "@/lib/utils/format/number";
import {
  categoriesAtom,
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
  effectiveSortKeysAtom,
  supportedParametersAtom,
  toolsOnlyAtom,
  discountedOnlyAtom,
  hideFreeAtom,
  viewModeAtom,
} from "@/store/models-store";
import { useAtom, useAtomValue } from "jotai";

export const NEW_MODEL_MS = 30 * 24 * 60 * 60 * 1000;

// "free" is deliberately absent: every free model carries a :free suffix, so
// the name match already covers it. These are the words that find nothing.
const FREE_KEYWORDS = [
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

// Free models carry no "free" in their name, so the word is matched against
// the FLAG instead. Prefix for progressive typing ("fre"), contains for a
// phrase ("show me free ones"); word.includes(query) would be neither, and
// would make every two-letter fragment of any keyword ("ar", "ti", "re") match
// the whole free catalogue.
function matchesFreeKeyword(query: string): boolean {
  if (query.length < 2) return false;
  return FREE_KEYWORDS.some((raw) => {
    const word = raw.toLowerCase();
    return word.startsWith(query) || query.includes(word);
  });
}

export function useModelsFilter() {
  const data = usePricingBrowseQuery().data;
  const rankings = useRankingsQuery("week");

  const [search, setSearch] = useAtom(searchAtom);
  const [outputModality, setOutputModality] = useAtom(outputModalityAtom);
  const selectedVendors = useAtomValue(selectedVendorsAtom);
  const [selectedModelName, setSelectedModelName] = useAtom(
    selectedModelNameAtom,
  );
  const viewMode = useAtomValue(viewModeAtom);
  const activeSortKeys = useAtomValue(effectiveSortKeysAtom);
  const inputModalities = useAtomValue(inputModalitiesAtom);
  const contextMin = useAtomValue(contextMinAtom);
  const priceRange = useAtomValue(priceRangeAtom);
  const outputPriceMax = useAtomValue(outputPriceMaxAtom);
  const maxAgeDays = useAtomValue(maxAgeDaysAtom);
  const series = useAtomValue(seriesAtom);
  const categories = useAtomValue(categoriesAtom);
  const supportedParameters = useAtomValue(supportedParametersAtom);
  const toolsOnly = useAtomValue(toolsOnlyAtom);
  const hideFree = useAtomValue(hideFreeAtom);
  const discountedOnly = useAtomValue(discountedOnlyAtom);

  const models = data?.models ?? [];
  const endpointMap = data?.supported_endpoint ?? {};

  const rankMap = new Map<string, RankedModel>(
    (rankings.data?.models ?? []).map((row) => [row.model_name, row]),
  );

  const selectedModel =
    models.find((m) => m.model_name === selectedModelName) ?? null;

  const query = search.trim().toLowerCase();
  const ageCutoff =
    maxAgeDays > 0 ? dayjs().valueOf() - maxAgeDays * 86_400_000 : 0;
  const tabModels = models.filter((model) => {
    // vendor is declared required but the gateway ships rows without it, and an
    // undefined here threw on every keystroke that reached those rows.
    const matchesSearch =
      query.length === 0 ||
      model.model_name.toLowerCase().includes(query) ||
      (model.vendor?.toLowerCase().includes(query) ?? false) ||
      (model.is_free && matchesFreeKeyword(query));
    const matchesVendor =
      selectedVendors.length === 0 || selectedVendors.includes(model.vendor);
    const modelInputs = model.metadata?.inputModalities ?? [];
    const matchesInputModalities =
      inputModalities.length === 0 ||
      inputModalities.every((mod) => modelInputs.includes(mod));
    const ctx =
      model.metadata?.contextWindow ?? model.metadata?.maxInputTokens ?? 0;
    const matchesContext = contextMin === 0 || ctx >= contextMin;
    const price = effectivePrice(model);
    const matchesPrice =
      price >= priceRange[0] &&
      (priceRange[1] >= PRICE_MAX || price <= priceRange[1]);
    const matchesOutputPrice =
      outputPriceMax >= PRICE_MAX || model.output_price <= outputPriceMax;
    const ts = model.release_ts;
    const matchesAge = ageCutoff === 0 || (ts > 0 && ts >= ageCutoff);
    const modelCats = model.metadata?.categories ?? model.tags;
    const matchesCategories =
      categories.length === 0 || categories.some((c) => modelCats.includes(c));
    const matchesSeries =
      series.length === 0 ||
      (model.metadata?.series
        ? series.includes(model.metadata?.series)
        : false);
    const modelParams = model.metadata?.supportedParametersAll ?? [];
    const matchesParams =
      supportedParameters.length === 0 ||
      supportedParameters.every((p) => modelParams.includes(p));
    const matchesTools = !toolsOnly || model.metadata?.supportsTools === true;
    const matchesPaid = !hideFree || !model.is_free;
    const matchesDiscount = !discountedOnly || bestDiscountPercent(model) > 0;
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
      matchesTools &&
      matchesPaid &&
      matchesDiscount
    );
  });

  const filtered = sortModels(
    tabModels.filter((model) => matchesModality(model, outputModality)),
    (m) => m,
    activeSortKeys,
    rankMap,
  );

  return {
    search,
    setSearch,
    outputModality,
    setOutputModality,
    selectedModel,
    setSelectedModelName,
    viewMode,
    models,
    tabModels,
    filtered,
    rankMap,
    endpointMap,
  };
}
