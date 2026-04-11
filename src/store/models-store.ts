import { msg } from "@/lib/config/constants";
import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { ModelTypeFilter } from "@/lib/types/enums";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ViewMode = "grid" | "list";
export type SortOrder = "name" | "priceAsc" | "priceDesc";

export type ModelsStoreState = {
  search: string;
  typeFilter: ModelTypeFilter;
  selectedVendors: string[];
  selectedModelName: string | null;
  viewMode: ViewMode;
  sortOrder: SortOrder;
};

export const MODELS_STORE_KEY = "models-store";

export const INITIAL_MODELS_STATE: ModelsStoreState = {
  search: "",
  typeFilter: ModelTypeFilter.ALL,
  selectedVendors: [],
  selectedModelName: null,
  viewMode: "grid",
  sortOrder: "name",
};

export const modelsStoreAtom = atomWithStorage<ModelsStoreState>(
  MODELS_STORE_KEY,
  INITIAL_MODELS_STATE,
  jotaiCookieStorage,
);

export const searchAtom = atom(
  (get) => get(modelsStoreAtom).search,
  (get, set, value: string) => {
    const state = get(modelsStoreAtom);
    set(modelsStoreAtom, { ...state, search: value });
  },
);

export const typeFilterAtom = atom(
  (get) => get(modelsStoreAtom).typeFilter,
  (get, set, value: ModelTypeFilter) => {
    const state = get(modelsStoreAtom);
    set(modelsStoreAtom, { ...state, typeFilter: value });
  },
);

export const selectedVendorsAtom = atom(
  (get) => {
    const val = get(modelsStoreAtom).selectedVendors;
    return Array.isArray(val) ? val : [];
  },
  (get, set, value: string[]) => {
    const state = get(modelsStoreAtom);
    set(modelsStoreAtom, { ...state, selectedVendors: value });
  },
);

export const selectedModelNameAtom = atom(
  (get) => get(modelsStoreAtom).selectedModelName,
  (get, set, value: string | null) => {
    const state = get(modelsStoreAtom);
    set(modelsStoreAtom, { ...state, selectedModelName: value });
  },
);

export const viewModeAtom = atom(
  (get) => get(modelsStoreAtom).viewMode ?? "grid",
  (get, set, value: ViewMode) => {
    const state = get(modelsStoreAtom);
    set(modelsStoreAtom, { ...state, viewMode: value });
  },
);

export const sortOrderAtom = atom(
  (get) => get(modelsStoreAtom).sortOrder ?? "name",
  (get, set, value: SortOrder) => {
    const state = get(modelsStoreAtom);
    set(modelsStoreAtom, { ...state, sortOrder: value });
  },
);

export const clearFiltersAtom = atom(null, (get, set) => {
  const state = get(modelsStoreAtom);
  set(modelsStoreAtom, {
    ...state,
    search: "",
    selectedVendors: [],
    typeFilter: ModelTypeFilter.ALL,
    sortOrder: "name",
  });
});

export const FILTER_OPTIONS = [
  { key: ModelTypeFilter.ALL, labelKey: msg("MODELS.FILTER.ALL") },
  { key: ModelTypeFilter.TEXT, labelKey: msg("MODELS.FILTER.TEXT") },
  { key: ModelTypeFilter.IMAGE, labelKey: msg("MODELS.FILTER.IMAGE") },
  { key: ModelTypeFilter.VIDEO, labelKey: msg("MODELS.FILTER.VIDEO") },
  { key: ModelTypeFilter.AUDIO, labelKey: msg("MODELS.FILTER.AUDIO") },
  { key: ModelTypeFilter.EMBEDDING, labelKey: msg("MODELS.FILTER.EMBEDDING") },
];
