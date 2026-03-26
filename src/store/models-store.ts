import { msg } from "@/lib/config/constants";
import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { ModelTypeFilter } from "@/lib/types/enums";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ModelsStoreState = {
  search: string;
  typeFilter: ModelTypeFilter;
  vendorFilter: string;
  selectedModelName: string | null;
};

export const MODELS_STORE_KEY = "models-store";

export const INITIAL_MODELS_STATE: ModelsStoreState = {
  search: "",
  typeFilter: ModelTypeFilter.ALL,
  vendorFilter: "all",
  selectedModelName: null,
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

export const vendorFilterAtom = atom(
  (get) => get(modelsStoreAtom).vendorFilter,
  (get, set, value: string) => {
    const state = get(modelsStoreAtom);
    set(modelsStoreAtom, { ...state, vendorFilter: value });
  },
);

export const selectedModelNameAtom = atom(
  (get) => get(modelsStoreAtom).selectedModelName,
  (get, set, value: string | null) => {
    const state = get(modelsStoreAtom);
    set(modelsStoreAtom, { ...state, selectedModelName: value });
  },
);

export const FILTER_OPTIONS = [
  { key: ModelTypeFilter.ALL, labelKey: msg("MODELS.FILTER_ALL") },
  { key: ModelTypeFilter.TEXT, labelKey: msg("MODELS.FILTER_TEXT") },
  { key: ModelTypeFilter.IMAGE, labelKey: msg("MODELS.FILTER_IMAGE") },
  { key: ModelTypeFilter.VIDEO, labelKey: msg("MODELS.FILTER_VIDEO") },
  { key: ModelTypeFilter.AUDIO, labelKey: msg("MODELS.FILTER_AUDIO") },
  { key: ModelTypeFilter.EMBEDDING, labelKey: msg("MODELS.FILTER_EMBEDDING") },
];
