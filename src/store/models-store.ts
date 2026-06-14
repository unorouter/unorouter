import { jotaiCookieStorage } from "@/lib/config/table-storage";
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
  | "contextDesc";

export type ModelsStoreState = {
  search: string;
  outputModality: string;
  selectedVendors: string[];
  selectedModelName: string | null;
  viewMode: ViewMode;
  sortOrder: SortOrder;
  collapsedVendors: string[];
  inputModalities: string[];
  contextMin: number;
  priceRange: [number, number];
  series: string[];
  categories: string[];
  supportedParameters: string[];
};

export const MODELS_STORE_KEY = "models-store";

// Upper bound for the prompt-price slider (per 1M tokens); also the "no max" sentinel.
export const PRICE_MAX = 100;

export const INITIAL_MODELS_STATE: ModelsStoreState = {
  search: "",
  outputModality: "text",
  selectedVendors: [],
  selectedModelName: null,
  viewMode: "table",
  sortOrder: "newest",
  collapsedVendors: [],
  inputModalities: [],
  contextMin: 0,
  priceRange: [0, PRICE_MAX],
  series: [],
  categories: [],
  supportedParameters: [],
};

export const modelsStoreAtom = atomWithStorage<ModelsStoreState>(
  MODELS_STORE_KEY,
  INITIAL_MODELS_STATE,
  jotaiCookieStorage,
);

const arr = (val: unknown): string[] => (Array.isArray(val) ? val : []);

export const searchAtom = atom(
  (get) => get(modelsStoreAtom).search,
  (get, set, value: string) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), search: value });
  },
);

export const selectedVendorsAtom = atom(
  (get) => arr(get(modelsStoreAtom).selectedVendors),
  (get, set, value: string[]) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), selectedVendors: value });
  },
);

export const selectedModelNameAtom = atom(
  (get) => get(modelsStoreAtom).selectedModelName,
  (get, set, value: string | null) => {
    set(modelsStoreAtom, {
      ...get(modelsStoreAtom),
      selectedModelName: value,
    });
  },
);

export const outputModalityAtom = atom(
  (get) => get(modelsStoreAtom).outputModality ?? "text",
  (get, set, value: string) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), outputModality: value });
  },
);

export const viewModeAtom = atom(
  (get): ViewMode => {
    const v = get(modelsStoreAtom).viewMode;
    return v === "table" || v === "list" ? v : "table";
  },
  (get, set, value: ViewMode) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), viewMode: value });
  },
);

export const sortOrderAtom = atom(
  (get) => get(modelsStoreAtom).sortOrder ?? "newest",
  (get, set, value: SortOrder) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), sortOrder: value });
  },
);

export const inputModalitiesAtom = atom(
  (get) => arr(get(modelsStoreAtom).inputModalities),
  (get, set, value: string[]) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), inputModalities: value });
  },
);

export const contextMinAtom = atom(
  (get) => get(modelsStoreAtom).contextMin ?? 0,
  (get, set, value: number) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), contextMin: value });
  },
);

export const priceRangeAtom = atom(
  (get): [number, number] => {
    const val = get(modelsStoreAtom).priceRange;
    return Array.isArray(val) && val.length === 2
      ? [val[0], val[1]]
      : [0, PRICE_MAX];
  },
  (get, set, value: [number, number]) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), priceRange: value });
  },
);

export const seriesAtom = atom(
  (get) => arr(get(modelsStoreAtom).series),
  (get, set, value: string[]) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), series: value });
  },
);

export const categoriesAtom = atom(
  (get) => arr(get(modelsStoreAtom).categories),
  (get, set, value: string[]) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), categories: value });
  },
);

export const supportedParametersAtom = atom(
  (get) => arr(get(modelsStoreAtom).supportedParameters),
  (get, set, value: string[]) => {
    set(modelsStoreAtom, {
      ...get(modelsStoreAtom),
      supportedParameters: value,
    });
  },
);

// Used by the status page (vendor collapse), not the models catalog filters.
export const collapsedVendorsAtom = atom(
  (get) => arr(get(modelsStoreAtom).collapsedVendors),
  (get, set, value: string[]) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), collapsedVendors: value });
  },
);

export const toggleVendorCollapsedAtom = atom(
  null,
  (get, set, vendor: string) => {
    const state = get(modelsStoreAtom);
    const current = arr(state.collapsedVendors);
    const next = current.includes(vendor)
      ? current.filter((v) => v !== vendor)
      : [...current, vendor];
    set(modelsStoreAtom, { ...state, collapsedVendors: next });
  },
);

    // Full reset: search, output-modality tab, sort, view, and every filter back to defaults. Column-sort lives in the DataTable store and is cleared by the page alongside this.
export const clearFiltersAtom = atom(null, (get, set) => {
  set(modelsStoreAtom, {
    ...get(modelsStoreAtom),
    search: "",
    outputModality: "text",
    sortOrder: "newest",
    viewMode: "table",
    selectedVendors: [],
    inputModalities: [],
    contextMin: 0,
    priceRange: [0, PRICE_MAX],
    series: [],
    categories: [],
    supportedParameters: [],
  });
});

    // True when any user-facing setting differs from default (drives the reset button); collapsedVendors/selectedModelName are not user filters.
export const isDirtyAtom = atom((get) => {
  const s = get(modelsStoreAtom);
  return (
    (s.search ?? "").trim().length > 0 ||
    (s.outputModality ?? "text") !== "text" ||
    (s.sortOrder ?? "newest") !== "newest" ||
    (s.viewMode ?? "table") !== "table" ||
    (Array.isArray(s.selectedVendors) && s.selectedVendors.length > 0) ||
    (Array.isArray(s.inputModalities) && s.inputModalities.length > 0) ||
    (Array.isArray(s.series) && s.series.length > 0) ||
    (Array.isArray(s.categories) && s.categories.length > 0) ||
    (Array.isArray(s.supportedParameters) &&
      s.supportedParameters.length > 0) ||
    (s.contextMin ?? 0) > 0 ||
    (Array.isArray(s.priceRange) && s.priceRange[1] < PRICE_MAX)
  );
});
