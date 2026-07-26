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
  | "contextDesc";

export type ModelsStoreState = {
  search: string;
  outputModality: OutputModality;
  selectedVendors: string[];
  selectedModelName: string | null;
  viewMode: ViewMode;
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
};

export const MODELS_STORE_KEY = "models-store";

export const PRICE_MAX = 100;

export const INITIAL_MODELS_STATE: ModelsStoreState = {
  search: "",
  outputModality: "all",
  selectedVendors: [],
  selectedModelName: null,
  viewMode: "table",
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
  (get) => get(modelsStoreAtom).outputModality ?? "all",
  (get, set, value: OutputModality) => {
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

export const outputPriceMaxAtom = atom(
  (get) => get(modelsStoreAtom).outputPriceMax ?? PRICE_MAX,
  (get, set, value: number) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), outputPriceMax: value });
  },
);

export const maxAgeDaysAtom = atom(
  (get) => get(modelsStoreAtom).maxAgeDays ?? 0,
  (get, set, value: number) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), maxAgeDays: value });
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

export const toolsOnlyAtom = atom(
  (get) => get(modelsStoreAtom).toolsOnly === true,
  (get, set, value: boolean) => {
    set(modelsStoreAtom, { ...get(modelsStoreAtom), toolsOnly: value });
  },
);

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

export const clearFiltersAtom = atom(null, (get, set) => {
  set(modelsStoreAtom, {
    ...get(modelsStoreAtom),
    search: "",
    outputModality: "all",
    sortOrder: "newest",
    viewMode: "table",
    selectedVendors: [],
    inputModalities: [],
    contextMin: 0,
    priceRange: [0, PRICE_MAX],
    outputPriceMax: PRICE_MAX,
    maxAgeDays: 0,
    series: [],
    categories: [],
    supportedParameters: [],
    toolsOnly: false,
  });
});

export const isDirtyAtom = atom((get) => {
  const s = get(modelsStoreAtom);
  return (
    (s.search ?? "").trim().length > 0 ||
    (s.outputModality ?? "all") !== "all" ||
    (s.sortOrder ?? "newest") !== "newest" ||
    (s.viewMode ?? "table") !== "table" ||
    (Array.isArray(s.selectedVendors) && s.selectedVendors.length > 0) ||
    (Array.isArray(s.inputModalities) && s.inputModalities.length > 0) ||
    (Array.isArray(s.series) && s.series.length > 0) ||
    (Array.isArray(s.categories) && s.categories.length > 0) ||
    (Array.isArray(s.supportedParameters) &&
      s.supportedParameters.length > 0) ||
    s.toolsOnly === true ||
    (s.contextMin ?? 0) > 0 ||
    (Array.isArray(s.priceRange) && s.priceRange[1] < PRICE_MAX) ||
    (s.outputPriceMax ?? PRICE_MAX) < PRICE_MAX ||
    (s.maxAgeDays ?? 0) > 0
  );
});

// Count of ACTIVE content filters (excludes sort + view-mode, which don't hide
// rows). Drives the reset-button badge so mobile users notice a filter is on
// when the list looks unexpectedly short.
export const activeFilterCountAtom = atom((get) => {
  const s = get(modelsStoreAtom);
  let n = 0;
  if ((s.search ?? "").trim().length > 0) n++;
  if ((s.outputModality ?? "all") !== "all") n++;
  if (Array.isArray(s.selectedVendors)) n += s.selectedVendors.length;
  if (Array.isArray(s.inputModalities)) n += s.inputModalities.length;
  if (Array.isArray(s.series)) n += s.series.length;
  if (Array.isArray(s.categories)) n += s.categories.length;
  if (Array.isArray(s.supportedParameters)) n += s.supportedParameters.length;
  if (s.toolsOnly === true) n++;
  if ((s.contextMin ?? 0) > 0) n++;
  if (Array.isArray(s.priceRange) && s.priceRange[1] < PRICE_MAX) n++;
  if ((s.outputPriceMax ?? PRICE_MAX) < PRICE_MAX) n++;
  if ((s.maxAgeDays ?? 0) > 0) n++;
  return n;
});
