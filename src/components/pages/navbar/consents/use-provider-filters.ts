"use client";

import { providerName } from "@/lib/api/provider-consent";
import { countryName } from "@/components/elements/model/group-data-policy";
import type { ProviderConsentItem } from "@/openapi";
import { useLocale } from "next-intl";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  DEFAULT_PROVIDER_SORT,
  PROVIDER_SORT_VALUES,
  PROVIDER_STATUSES,
  sortProviders,
} from "./provider-rows";

// Prefixed so the provider tab keeps its own state next to the model tab's.
const PARSERS = {
  pq: parseAsString.withDefault(""),
  pactive: parseAsBoolean.withDefault(false),
  pcountry: parseAsArrayOf(parseAsString).withDefault([]),
  pstatus: parseAsArrayOf(parseAsStringLiteral(PROVIDER_STATUSES)).withDefault(
    [],
  ),
  porder: parseAsArrayOf(
    parseAsStringLiteral(PROVIDER_SORT_VALUES),
  ).withDefault([]),
};

export function useProviderFilters(providers: ProviderConsentItem[]) {
  const locale = useLocale();
  const [params, setParams] = useQueryStates(PARSERS);

  const needle = params.pq.trim().toLowerCase();
  const matching = providers.filter((p) => {
    const matchesSearch =
      needle.length === 0 ||
      providerName(p).toLowerCase().includes(needle) ||
      countryName(p.country, locale).toLowerCase().includes(needle) ||
      (p.tags ?? []).some((tag) => tag.toLowerCase().includes(needle)) ||
      (p.models ?? []).some((m) => m.toLowerCase().includes(needle));
    const matchesCountry =
      params.pcountry.length === 0 || params.pcountry.includes(p.country);
    const matchesStatus =
      params.pstatus.length === 0 || params.pstatus.includes(p.status);
    const matchesActive = !params.pactive || p.active;
    return matchesSearch && matchesCountry && matchesStatus && matchesActive;
  });
  const activeSort =
    params.porder.length > 0 ? params.porder : DEFAULT_PROVIDER_SORT;
  const filtered = sortProviders(matching, activeSort, locale);

  const activeFilterCount =
    params.pcountry.length +
    params.pstatus.length +
    (params.pactive ? 1 : 0) +
    (needle.length > 0 ? 1 : 0);

  function reset() {
    void setParams({
      pq: null,
      pactive: null,
      pcountry: null,
      pstatus: null,
      porder: null,
    });
  }

  return { params, setParams, filtered, activeFilterCount, activeSort, reset };
}
