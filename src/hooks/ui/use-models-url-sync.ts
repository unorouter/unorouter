"use client";

import { OUTPUT_MODALITIES } from "@/lib/api/model-modality";
import {
  INITIAL_MODELS_STATE,
  modelsStoreAtom,
  PRICE_MAX,
  type ModelsStoreState,
} from "@/store/models-store";
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
  modality: parseAsStringLiteral(OUTPUT_MODALITIES),
  order: parseAsStringLiteral(SORT_VALUES),
  tools: parseAsBoolean,
  q: parseAsString,
  view: parseAsStringLiteral(["table", "list"] as const),
};

const arr = (val: unknown): string[] => (Array.isArray(val) ? val : []);

// URL <-> filter-store bridge: nuqs owns the URL (useQueryStates, shallow
// replaceState, defaults elided), jotai owns the state, and the sync runs at
// the STORE level rather than through useAtom. atomWithStorage pulls the
// cookie into the store on atom onMount, which fires while the first commit's
// subscribers are still registering - components subscribed in that commit
// are never notified and render stale defaults. So this hook: (1) subscribes
// the base atom directly, (2) seeds URL params into fields still at their
// default (cookie wins over a stale link), (3) re-sets the store one tick
// later so every subscriber that missed the hydration re-renders, and
// (4) mirrors store changes back into the URL via the nuqs setter.
export function ModelsUrlSync() {
  const store = useStore();
  const [params, setParams] = useQueryStates(PARSERS);

  useEffect(() => {
    const writeback = () => {
      const s = store.get(modelsStoreAtom);
      const priceMax = Array.isArray(s.priceRange)
        ? (s.priceRange[1] ?? PRICE_MAX)
        : PRICE_MAX;
      void setParams({
        input_modalities: arr(s.inputModalities).length
          ? arr(s.inputModalities)
          : null,
        arch: arr(s.series).length ? arr(s.series) : null,
        categories: arr(s.categories).length ? arr(s.categories) : null,
        supported_parameters: arr(s.supportedParameters).length
          ? arr(s.supportedParameters)
          : null,
        providers: arr(s.selectedVendors).length
          ? arr(s.selectedVendors)
          : null,
        vendor: null,
        context: s.contextMin > 0 ? s.contextMin : null,
        max_price: priceMax < PRICE_MAX ? priceMax : null,
        modality: s.outputModality !== "text" ? s.outputModality : null,
        order: s.sortOrder !== "newest" ? s.sortOrder : null,
        tools: s.toolsOnly ? true : null,
        q: s.search ? s.search : null,
        view: s.viewMode !== "table" ? s.viewMode : null,
      });
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
      if (
        seed.input_modalities?.length &&
        arr(cur.inputModalities).length === 0
      )
        next.inputModalities = seed.input_modalities;
      if (seed.arch?.length && arr(cur.series).length === 0)
        next.series = seed.arch;
      if (seed.categories?.length && arr(cur.categories).length === 0)
        next.categories = seed.categories;
      if (
        seed.supported_parameters?.length &&
        arr(cur.supportedParameters).length === 0
      )
        next.supportedParameters = seed.supported_parameters;
      const prov = seed.providers ?? seed.vendor;
      if (prov?.length && arr(cur.selectedVendors).length === 0)
        next.selectedVendors = prov;
      if (seed.context && seed.context > 0 && cur.contextMin === 0)
        next.contextMin = seed.context;
      const curMax = Array.isArray(cur.priceRange)
        ? (cur.priceRange[1] ?? PRICE_MAX)
        : PRICE_MAX;
      if (seed.max_price && seed.max_price > 0 && curMax >= PRICE_MAX)
        next.priceRange = [0, seed.max_price];
      if (seed.modality && cur.outputModality === "text")
        next.outputModality = seed.modality;
      if (seed.order && cur.sortOrder === "newest") next.sortOrder = seed.order;
      if (seed.tools && !cur.toolsOnly) next.toolsOnly = true;
      if (seed.q && !cur.search) next.search = seed.q;
      if (seed.view === "list" && cur.viewMode === "table")
        next.viewMode = "list";

      // Components rendered INITIAL state (cookie hydration lands after their
      // first render and its notify does not reliably reach them). jotai only
      // notifies a derived atom's subscribers when a recompute CHANGES its
      // cached value, and those caches are in an unknown state here - so
      // reset to INITIAL first (aligns every cache with what is on screen),
      // then set the real state: every differing field is now a guaranteed
      // diff and re-renders. Same tick, replaceState-only, no flicker.
      if (JSON.stringify(next) !== JSON.stringify(INITIAL_MODELS_STATE)) {
        store.set(modelsStoreAtom, INITIAL_MODELS_STATE);
      }
      store.set(modelsStoreAtom, next);
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
