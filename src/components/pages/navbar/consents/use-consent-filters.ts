"use client";

import { useRankingsQuery } from "@/hooks/models/rankings-hook";
import { matchesModality, OUTPUT_MODALITIES } from "@/lib/api/model-modality";
import { sortModels } from "@/lib/api/model-sort";
import type { RankedModel } from "@/openapi";
import { SORT_VALUES, type SortOrder } from "@/store/models-store";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  CONSENT_KINDS,
  CONSENT_STATUSES,
  PRICE_KINDS,
  type ConsentRow,
} from "./consent-rows";

const PARSERS = {
  q: parseAsString.withDefault(""),
  modality: parseAsStringLiteral(OUTPUT_MODALITIES).withDefault("all"),
  status: parseAsArrayOf(parseAsStringLiteral(CONSENT_STATUSES)).withDefault(
    [],
  ),
  kind: parseAsArrayOf(parseAsStringLiteral(CONSENT_KINDS)).withDefault([]),
  country: parseAsArrayOf(parseAsString).withDefault([]),
  price: parseAsArrayOf(parseAsStringLiteral(PRICE_KINDS)).withDefault([]),
  order: parseAsArrayOf(parseAsStringLiteral(SORT_VALUES)).withDefault([]),
};

// The models page falls back to its initial sortOrder when nothing is picked.
const DEFAULT_SORT: readonly SortOrder[] = ["newest"];

export function useConsentFilters(rows: ConsentRow[]) {
  const [params, setParams] = useQueryStates(PARSERS);
  const rankings = useRankingsQuery("week");
  const rankMap = new Map<string, RankedModel>(
    (rankings.data?.models ?? []).map((row) => [row.model_name, row]),
  );
  const activeSort = params.order.length > 0 ? params.order : DEFAULT_SORT;

  const needle = params.q.trim().toLowerCase();
  // Everything but the modality, so the tab counts follow the other filters
  // the way they do on the models page.
  const tabRows = rows.filter((row) => {
    const m = row.model;
    const matchesSearch =
      needle.length === 0 ||
      m.model_name.toLowerCase().includes(needle) ||
      (m.vendor?.toLowerCase().includes(needle) ?? false);
    const matchesStatus =
      params.status.length === 0 ||
      params.status.some((status) => status === row.status);
    const matchesKind =
      params.kind.length === 0 || params.kind.includes(row.kind);
    const matchesCountry =
      params.country.length === 0 ||
      row.countries.some((code) => params.country.includes(code));
    const matchesPrice =
      params.price.length === 0 ||
      params.price.includes(m.is_free ? "free" : "paid");
    return (
      matchesSearch &&
      matchesStatus &&
      matchesKind &&
      matchesCountry &&
      matchesPrice
    );
  });
  const filtered = sortModels(
    tabRows.filter((row) => matchesModality(row.model, params.modality)),
    (row) => row.model,
    activeSort,
    rankMap,
  );

  const activeFilterCount =
    params.status.length +
    params.kind.length +
    params.country.length +
    params.price.length +
    (params.modality !== "all" ? 1 : 0) +
    (needle.length > 0 ? 1 : 0);

  const reset = () => void setParams(null);

  return {
    params,
    setParams,
    tabRows,
    filtered,
    activeFilterCount,
    activeSort,
    rankMap,
    reset,
  };
}
