"use client";

import {
  categoriesAtom,
  contextMinAtom,
  inputModalitiesAtom,
  outputModalityAtom,
  PRICE_MAX,
  priceRangeAtom,
  selectedVendorsAtom,
  seriesAtom,
  sortOrderAtom,
  supportedParametersAtom,
  toolsOnlyAtom,
  type SortOrder,
} from "@/store/models-store";
import { OUTPUT_MODALITIES } from "@/lib/api/model-modality";
import { useAtom } from "jotai";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const SORT_VALUES: SortOrder[] = [
  "newest",
  "popular",
  "topWeekly",
  "name",
  "priceAsc",
  "priceDesc",
  "contextDesc",
];

function csv(value: string | null): string[] {
  return value
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
}

export function useModelsUrlSync() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputModalities, setInputModalities] = useAtom(inputModalitiesAtom);
  const [series, setSeries] = useAtom(seriesAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [supportedParameters, setSupportedParameters] = useAtom(
    supportedParametersAtom,
  );
  const [selectedVendors, setSelectedVendors] = useAtom(selectedVendorsAtom);
  const [contextMin, setContextMin] = useAtom(contextMinAtom);
  const [priceRange, setPriceRange] = useAtom(priceRangeAtom);
  const [outputModality, setOutputModality] = useAtom(outputModalityAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const [toolsOnly, setToolsOnly] = useAtom(toolsOnlyAtom);

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const im = csv(searchParams.get("input_modalities"));
    if (im.length && inputModalities.length === 0) setInputModalities(im);
    const ser = csv(searchParams.get("arch"));
    if (ser.length && series.length === 0) setSeries(ser);
    const cat = csv(searchParams.get("categories"));
    if (cat.length && categories.length === 0) setCategories(cat);
    const sp = csv(searchParams.get("supported_parameters"));
    if (sp.length && supportedParameters.length === 0)
      setSupportedParameters(sp);
    const prov = csv(
      searchParams.get("providers") ?? searchParams.get("vendor"),
    );
    if (prov.length && selectedVendors.length === 0) setSelectedVendors(prov);
    const ctx = Number(searchParams.get("context"));
    if (Number.isFinite(ctx) && ctx > 0 && contextMin === 0) setContextMin(ctx);
    const maxP = Number(searchParams.get("max_price"));
    if (Number.isFinite(maxP) && maxP > 0 && priceRange[1] >= PRICE_MAX)
      setPriceRange([0, maxP]);
    const mod = OUTPUT_MODALITIES.find(
      (x) => x === searchParams.get("modality"),
    );
    if (mod && outputModality === "text") setOutputModality(mod);
    const order = SORT_VALUES.find((x) => x === searchParams.get("order"));
    if (order && sortOrder === "newest") setSortOrder(order);
    if (searchParams.get("tools") === "1" && !toolsOnly) setToolsOnly(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!seeded.current) return;
    const params = new URLSearchParams();
    if (inputModalities.length)
      params.set("input_modalities", inputModalities.join(","));
    if (series.length) params.set("arch", series.join(","));
    if (categories.length) params.set("categories", categories.join(","));
    if (supportedParameters.length)
      params.set("supported_parameters", supportedParameters.join(","));
    if (selectedVendors.length)
      params.set("providers", selectedVendors.join(","));
    if (contextMin > 0) params.set("context", String(contextMin));
    if (priceRange[1] < PRICE_MAX)
      params.set("max_price", String(priceRange[1]));
    if (outputModality !== "text") params.set("modality", outputModality);
    if (sortOrder !== "newest") params.set("order", sortOrder);
    if (toolsOnly) params.set("tools", "1");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [
    inputModalities,
    series,
    categories,
    supportedParameters,
    selectedVendors,
    contextMin,
    priceRange,
    outputModality,
    sortOrder,
    toolsOnly,
    router,
  ]);
}
