import { jotaiCookieStorage } from "@/lib/config/table-storage";
import type { OutputModality } from "@/lib/api/model-modality";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ViewMode = "table" | "list";
export type SortOrder =
  | "newest"
  | "popular"
  | "topWeekly"
  | "name"
  | "priceAsc"
  | "priceDesc"
  | "contextDesc"
  | "uptimeDesc"
  | "successDesc";

export const SORT_VALUES: readonly SortOrder[] = [
  "popular",
  "newest",
  "topWeekly",
  "priceAsc",
  "priceDesc",
  "contextDesc",
  "uptimeDesc",
  "successDesc",
  "name",
];

export type ModelsStoreState = {
  search: string;
  outputModality: OutputModality;
  selectedVendors: string[];
  selectedModelName: string | null;
  viewMode: ViewMode;
  // Ordered: index 0 is the primary key, later keys break its ties. The UI
  // numbers them from this order. Empty = the sortOrder default below, which
  // stays because a shared link carries ?order= and must keep working.
  sortKeys: SortOrder[];
  sortOrder: SortOrder;
  collapsedVendors: string[];
  inputModalities: string[];
  contextMin: number;
  priceRange: [number, number];
  outputPriceMax: number;
  maxAgeDays: number;
  series: string[];
  categories: string[];
  supportedParameters: string[];
  toolsOnly: boolean;
  hideFree: boolean;
};

export const MODELS_STORE_KEY = "models-store";

export const PRICE_MAX = 100;

export const INITIAL_MODELS_STATE: ModelsStoreState = {
  search: "",
  outputModality: "all",
  selectedVendors: [],
  selectedModelName: null,
  viewMode: "table",
  sortKeys: [],
  sortOrder: "newest",
  collapsedVendors: [],
  inputModalities: [],
  contextMin: 0,
  priceRange: [0, PRICE_MAX],
  outputPriceMax: PRICE_MAX,
  maxAgeDays: 0,
  series: [],
  categories: [],
  supportedParameters: [],
  toolsOnly: false,
  hideFree: false,
};

export const modelsStoreAtom = atomWithStorage<ModelsStoreState>(
  MODELS_STORE_KEY,
  INITIAL_MODELS_STATE,
  jotaiCookieStorage,
);

const arr = (val: unknown): string[] => (Array.isArray(val) ? val : []);

// normalize also repairs WRONG-TYPED cookie values (schema drift), not just
// missing ones; `?? INITIAL` alone would pass garbage through.
function field<K extends keyof ModelsStoreState>(
  key: K,
  normalize?: (v: ModelsStoreState[K]) => ModelsStoreState[K],
) {
  return atom(
    (get) => {
      const v = get(modelsStoreAtom)[key] ?? INITIAL_MODELS_STATE[key];
      return normalize ? normalize(v) : v;
    },
    (get, set, value: ModelsStoreState[K]) => {
      set(modelsStoreAtom, { ...get(modelsStoreAtom), [key]: value });
    },
  );
}

export const searchAtom = field("search");
export const selectedVendorsAtom = field("selectedVendors", arr);
export const selectedModelNameAtom = field("selectedModelName");
export const outputModalityAtom = field("outputModality");
export const viewModeAtom = field("viewMode", (v) =>
  v === "table" || v === "list" ? v : "table",
);
export const sortOrderAtom = field("sortOrder");
// Drops unknown values rather than passing them through: the list is
// cookie-persisted and URL-seeded, so a stale or hand-edited key would reach the
// comparator and silently sort by nothing.
export const sortKeysAtom = field("sortKeys", (v) =>
  Array.isArray(v) ? v.filter((k) => SORT_VALUES.includes(k)) : [],
);
// The keys actually applied, in priority order. Falls back to the single
// sortOrder so an untouched page and an ?order= link both still sort.
export const effectiveSortKeysAtom = atom<SortOrder[]>((get) => {
  const keys = get(sortKeysAtom);
  return keys.length > 0 ? keys : [get(sortOrderAtom)];
});
export const inputModalitiesAtom = field("inputModalities", arr);
export const contextMinAtom = field("contextMin");
export const priceRangeAtom = field("priceRange", (v) =>
  Array.isArray(v) && v.length === 2 ? [v[0], v[1]] : [0, PRICE_MAX],
);
export const outputPriceMaxAtom = field("outputPriceMax");
export const maxAgeDaysAtom = field("maxAgeDays");
export const seriesAtom = field("series", arr);
export const categoriesAtom = field("categories", arr);
export const supportedParametersAtom = field("supportedParameters", arr);
export const toolsOnlyAtom = field("toolsOnly", (v) => v === true);
export const hideFreeAtom = field("hideFree", (v) => v === true);
export const collapsedVendorsAtom = field("collapsedVendors", arr);

export const toggleVendorCollapsedAtom = atom(
  null,
  (get, set, vendor: string) => {
    const current = get(collapsedVendorsAtom);
    set(
      collapsedVendorsAtom,
      current.includes(vendor)
        ? current.filter((v) => v !== vendor)
        : [...current, vendor],
    );
  },
);

// Reset everything except collapsedVendors + selectedModelName (UI state, not
// filters).
export const clearFiltersAtom = atom(null, (get, set) => {
  const s = get(modelsStoreAtom);
  set(modelsStoreAtom, {
    ...INITIAL_MODELS_STATE,
    collapsedVendors: arr(s.collapsedVendors),
    selectedModelName: s.selectedModelName ?? null,
  });
});

// Count of ACTIVE content filters (excludes sort + view-mode, which don't hide
// rows). Drives the reset-button badge so mobile users notice a filter is on
// when the list looks unexpectedly short.
export const activeFilterCountAtom = atom((get) => {
  let n = 0;
  if (get(searchAtom).trim().length > 0) n++;
  if (get(outputModalityAtom) !== "all") n++;
  n += get(selectedVendorsAtom).length;
  n += get(inputModalitiesAtom).length;
  n += get(seriesAtom).length;
  n += get(categoriesAtom).length;
  n += get(supportedParametersAtom).length;
  if (get(toolsOnlyAtom)) n++;
  if (get(hideFreeAtom)) n++;
  if (get(contextMinAtom) > 0) n++;
  if (get(priceRangeAtom)[1] < PRICE_MAX) n++;
  if (get(outputPriceMaxAtom) < PRICE_MAX) n++;
  if (get(maxAgeDaysAtom) > 0) n++;
  return n;
});

export const isDirtyAtom = atom(
  (get) =>
    get(activeFilterCountAtom) > 0 ||
    get(sortKeysAtom).length > 0 ||
    get(sortOrderAtom) !== "newest" ||
    get(viewModeAtom) !== "table",
);
