"use client";

import { OUTPUT_MODALITIES } from "@/lib/api/model-modality";
import {
  INITIAL_MODELS_STATE,
  modelsStoreAtom,
  PRICE_MAX,
  type ModelsStoreState,
} from "@/store/models-store";
import { nonEmptyArray } from "@/lib/utils/base";
import { useStore } from "jotai";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useEffect } from "react";

const SORT_VALUES = [
  "newest",
  "popular",
  "topWeekly",
  "name",
  "priceAsc",
  "priceDesc",
  "contextDesc",
] as const;

const PARSERS = {
  input_modalities: parseAsArrayOf(parseAsString),
  arch: parseAsArrayOf(parseAsString),
  categories: parseAsArrayOf(parseAsString),
  supported_parameters: parseAsArrayOf(parseAsString),
  providers: parseAsArrayOf(parseAsString),
  vendor: parseAsArrayOf(parseAsString),
  context: parseAsInteger,
  max_price: parseAsFloat,
  max_output_price: parseAsFloat,
  max_age_days: parseAsInteger,
  modality: parseAsStringLiteral(OUTPUT_MODALITIES),
  order: parseAsStringLiteral(SORT_VALUES),
  tools: parseAsBoolean,
  q: parseAsString,
  view: parseAsStringLiteral(["table", "list"] as const),
};

export function ModelsUrlSync() {
  const store = useStore();
  const [params, setParams] = useQueryStates(PARSERS);

  useEffect(() => {
    // The seed below writes the atom twice (reset + set). Each write notifies
    // this subscriber, which calls setParams, which can re-enter the atom via
    // nuqs' URL update -> a self-feeding render loop that overflowed the stack
    // on iOS ("Maximum call stack size exceeded" on /models with filters).
    // Mute the writeback while the seed applies; it runs once after.
    let seeding = false;
    // Every setParams writes the URL, and the atom is cookie-persisted, so its
    // own setItem re-notifies this subscriber. Without an equality gate that
    // round trip re-enters setParams forever and overflows the stack on iOS,
    // whose limit is far lower than desktop. Only push a genuinely new value.
    let lastPushed = "";
    const writeback = () => {
      if (seeding) return;
      const s = store.get(modelsStoreAtom);
      const priceMax = Array.isArray(s.priceRange)
        ? (s.priceRange[1] ?? PRICE_MAX)
        : PRICE_MAX;
      const nextParams = {
        input_modalities: nonEmptyArray<string>(s.inputModalities),
        arch: nonEmptyArray<string>(s.series),
        categories: nonEmptyArray<string>(s.categories),
        supported_parameters: nonEmptyArray<string>(s.supportedParameters),
        providers: nonEmptyArray<string>(s.selectedVendors),
        vendor: null,
        context: s.contextMin > 0 ? s.contextMin : null,
        max_price: priceMax < PRICE_MAX ? priceMax : null,
        max_output_price:
          s.outputPriceMax < PRICE_MAX ? s.outputPriceMax : null,
        max_age_days: s.maxAgeDays > 0 ? s.maxAgeDays : null,
        modality: s.outputModality !== "all" ? s.outputModality : null,
        order: s.sortOrder !== "newest" ? s.sortOrder : null,
        tools: s.toolsOnly ? true : null,
        q: s.search ? s.search : null,
        view: s.viewMode !== "table" ? s.viewMode : null,
      };
      const key = JSON.stringify(nextParams);
      if (key === lastPushed) return;
      lastPushed = key;
      void setParams(nextParams);
    };
    const unsub = store.sub(modelsStoreAtom, writeback);

    // The closure holds the mount-time params (the link's own values):
    // subscribing above mounts the storage atom, whose cookie-hydration set
    // fires the writeback and rewrites the URL before the deferred seed runs.
    const seed = params;

    // Deferred one tick: this effect runs BEFORE the page components' own
    // subscription effects (child before parent), and jotai does not
    // reconcile a value that changed between their render and subscribe.
    const timer = setTimeout(() => {
      const cur = store.get(modelsStoreAtom);
      const next: ModelsStoreState = { ...cur };
      if (seed.input_modalities?.length && !nonEmptyArray(cur.inputModalities))
        next.inputModalities = seed.input_modalities;
      if (seed.arch?.length && !nonEmptyArray(cur.series))
        next.series = seed.arch;
      if (seed.categories?.length && !nonEmptyArray(cur.categories))
        next.categories = seed.categories;
      if (
        seed.supported_parameters?.length &&
        !nonEmptyArray(cur.supportedParameters)
      )
        next.supportedParameters = seed.supported_parameters;
      const prov = seed.providers ?? seed.vendor;
      if (prov?.length && !nonEmptyArray(cur.selectedVendors))
        next.selectedVendors = prov;
      if (seed.context && seed.context > 0 && cur.contextMin === 0)
        next.contextMin = seed.context;
      const curMax = Array.isArray(cur.priceRange)
        ? (cur.priceRange[1] ?? PRICE_MAX)
        : PRICE_MAX;
      if (seed.max_price && seed.max_price > 0 && curMax >= PRICE_MAX)
        next.priceRange = [0, seed.max_price];
      if (
        seed.max_output_price &&
        seed.max_output_price > 0 &&
        (cur.outputPriceMax ?? PRICE_MAX) >= PRICE_MAX
      )
        next.outputPriceMax = seed.max_output_price;
      if (
        seed.max_age_days &&
        seed.max_age_days > 0 &&
        (cur.maxAgeDays ?? 0) === 0
      )
        next.maxAgeDays = seed.max_age_days;
      if (seed.modality && cur.outputModality === "all")
        next.outputModality = seed.modality;
      if (seed.order && cur.sortOrder === "newest") next.sortOrder = seed.order;
      if (seed.tools && !cur.toolsOnly) next.toolsOnly = true;
      if (seed.q && !cur.search) next.search = seed.q;
      if (seed.view === "list" && cur.viewMode === "table")
        next.viewMode = "list";

      seeding = true;
      try {
        if (JSON.stringify(next) !== JSON.stringify(INITIAL_MODELS_STATE)) {
          store.set(modelsStoreAtom, INITIAL_MODELS_STATE);
        }
        store.set(modelsStoreAtom, next);
      } finally {
        seeding = false;
      }
      // One deliberate sync after the seed settles, so the URL reflects the
      // final state without the intermediate reset ever reaching nuqs.
      writeback();
    }, 0);
    return () => {
      clearTimeout(timer);
      unsub();
    };
    // params is deliberately mount-time-only (the link's values); setParams is
    // referentially stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  return null;
}
