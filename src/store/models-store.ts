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

export const clearFiltersAtom = atom(null, (get, set) => {
  set(modelsStoreAtom, {
    ...get(modelsStoreAtom),
    search: "",
    selectedVendors: [],
    sortOrder: "newest",
    inputModalities: [],
    contextMin: 0,
    priceRange: [0, PRICE_MAX],
    categories: [],
    supportedParameters: [],
  });
});
