import {
  initialTableStore,
  jotaiCookieStorage,
} from "@/lib/config/table-storage";
import { DataTableId, StoreId } from "@/lib/types/enums";
import type {
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { atomFamily } from "jotai-family";

export type DataTableStore = {
  globalFilter: string;
  rowSelection: RowSelectionState;
  columnVisibility: VisibilityState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  pagination: PaginationState;
};

export type DataTableStores = Record<DataTableId, DataTableStore>;

export const dataTableStorageAtom = atomWithStorage<DataTableStores>(
  StoreId.DATA_TABLES_STORE,
  {} as DataTableStores,
  jotaiCookieStorage,
);

const FRESH_STATE_IDS: DataTableId[] = [];

export const dataTableAtomFamily = atomFamily((id: DataTableId) => {
  const isFresh = FRESH_STATE_IDS.includes(id);

  if (isFresh) {
    return atom<
      DataTableStore,
      [Partial<DataTableStore> | ((prev: DataTableStore) => DataTableStore)],
      void
    >(initialTableStore(), (get, set, update) => {
      const current = get(dataTableAtomFamily(id));
      const newState =
        typeof update === "function"
          ? update(current)
          : { ...current, ...update };
      set(dataTableAtomFamily(id), newState);
    });
  }

  return atom<
    DataTableStore,
    [Partial<DataTableStore> | ((prev: DataTableStore) => DataTableStore)],
    void
  >(
    (get) => {
      const allTables = get(dataTableStorageAtom);
      return allTables[id] || initialTableStore();
    },
    (get, set, update) => {
      const allTables = get(dataTableStorageAtom);
      const current = allTables[id] || initialTableStore();
      const newState =
        typeof update === "function"
          ? update(current)
          : { ...current, ...update };
      set(dataTableStorageAtom, { ...allTables, [id]: newState });
    },
  );
});

export const createTableAtoms = (
  id: DataTableId,
  initialValues?: Partial<DataTableStore>,
) => {
  const isFresh = FRESH_STATE_IDS.includes(id);

  if (isFresh) {
    const freshAtom = atom<
      DataTableStore,
      [Partial<DataTableStore> | ((prev: DataTableStore) => DataTableStore)],
      void
    >(
      initialTableStore(initialValues),
      (get, set, update) => {
        const current = get(freshAtom);
        const newState =
          typeof update === "function"
            ? update(current)
            : { ...current, ...update };
        set(freshAtom, newState);
      },
    );

    return {
      baseAtom: freshAtom,
      globalFilterAtom: atom(
        (get) => get(freshAtom).globalFilter,
        (get, set, updaterOrValue: string | ((prev: string) => string)) => {
          set(freshAtom, (prev) => ({
            ...prev,
            globalFilter:
              typeof updaterOrValue === "function"
                ? updaterOrValue(prev.globalFilter)
                : updaterOrValue,
          }));
        },
      ),
      rowSelectionAtom: atom(
        (get) => get(freshAtom).rowSelection,
        (
          get,
          set,
          updaterOrValue:
            | RowSelectionState
            | ((prev: RowSelectionState) => RowSelectionState),
        ) => {
          set(freshAtom, (prev) => ({
            ...prev,
            rowSelection:
              typeof updaterOrValue === "function"
                ? updaterOrValue(prev.rowSelection)
                : updaterOrValue,
          }));
        },
      ),
      columnVisibilityAtom: atom(
        (get) => get(freshAtom).columnVisibility,
        (
          get,
          set,
          updaterOrValue:
            | VisibilityState
            | ((prev: VisibilityState) => VisibilityState),
        ) => {
          set(freshAtom, (prev) => ({
            ...prev,
            columnVisibility:
              typeof updaterOrValue === "function"
                ? updaterOrValue(prev.columnVisibility)
                : updaterOrValue,
          }));
        },
      ),
      columnFiltersAtom: atom(
        (get) => get(freshAtom).columnFilters,
        (
          get,
          set,
          updaterOrValue:
            | ColumnFiltersState
            | ((prev: ColumnFiltersState) => ColumnFiltersState),
        ) => {
          set(freshAtom, (prev) => ({
            ...prev,
            columnFilters:
              typeof updaterOrValue === "function"
                ? updaterOrValue(prev.columnFilters)
                : updaterOrValue,
          }));
        },
      ),
      sortingAtom: atom(
        (get) => get(freshAtom).sorting,
        (
          get,
          set,
          updaterOrValue: SortingState | ((prev: SortingState) => SortingState),
        ) => {
          set(freshAtom, (prev) => ({
            ...prev,
            sorting:
              typeof updaterOrValue === "function"
                ? updaterOrValue(prev.sorting)
                : updaterOrValue,
          }));
        },
      ),
      paginationAtom: atom(
        (get) => get(freshAtom).pagination,
        (
          get,
          set,
          updaterOrValue:
            | PaginationState
            | ((prev: PaginationState) => PaginationState),
        ) => {
          set(freshAtom, (prev) => ({
            ...prev,
            pagination:
              typeof updaterOrValue === "function"
                ? updaterOrValue(prev.pagination)
                : updaterOrValue,
          }));
        },
      ),
      resetTableAtom: atom(null, (get, set) =>
        set(freshAtom, initialTableStore(initialValues)),
      ),
    };
  }

  const baseAtom = dataTableAtomFamily(id);

  return {
    baseAtom,
    globalFilterAtom: atom(
      (get) => get(baseAtom).globalFilter,
      (get, set, updaterOrValue: string | ((prev: string) => string)) => {
        set(baseAtom, (prev) => ({
          ...prev,
          globalFilter:
            typeof updaterOrValue === "function"
              ? updaterOrValue(prev.globalFilter)
              : updaterOrValue,
        }));
      },
    ),
    rowSelectionAtom: atom(
      (get) => get(baseAtom).rowSelection,
      (
        get,
        set,
        updaterOrValue:
          | RowSelectionState
          | ((prev: RowSelectionState) => RowSelectionState),
      ) => {
        set(baseAtom, (prev) => ({
          ...prev,
          rowSelection:
            typeof updaterOrValue === "function"
              ? updaterOrValue(prev.rowSelection)
              : updaterOrValue,
        }));
      },
    ),
    columnVisibilityAtom: atom(
      (get) => get(baseAtom).columnVisibility,
      (
        get,
        set,
        updaterOrValue:
          | VisibilityState
          | ((prev: VisibilityState) => VisibilityState),
      ) => {
        set(baseAtom, (prev) => ({
          ...prev,
          columnVisibility:
            typeof updaterOrValue === "function"
              ? updaterOrValue(prev.columnVisibility)
              : updaterOrValue,
        }));
      },
    ),
    columnFiltersAtom: atom(
      (get) => get(baseAtom).columnFilters,
      (
        get,
        set,
        updaterOrValue:
          | ColumnFiltersState
          | ((prev: ColumnFiltersState) => ColumnFiltersState),
      ) => {
        set(baseAtom, (prev) => ({
          ...prev,
          columnFilters:
            typeof updaterOrValue === "function"
              ? updaterOrValue(prev.columnFilters)
              : updaterOrValue,
        }));
      },
    ),
    sortingAtom: atom(
      (get) => get(baseAtom).sorting,
      (
        get,
        set,
        updaterOrValue: SortingState | ((prev: SortingState) => SortingState),
      ) => {
        set(baseAtom, (prev) => ({
          ...prev,
          sorting:
            typeof updaterOrValue === "function"
              ? updaterOrValue(prev.sorting)
              : updaterOrValue,
        }));
      },
    ),
    paginationAtom: atom(
      (get) => get(baseAtom).pagination,
      (
        get,
        set,
        updaterOrValue:
          | PaginationState
          | ((prev: PaginationState) => PaginationState),
      ) => {
        set(baseAtom, (prev) => ({
          ...prev,
          pagination:
            typeof updaterOrValue === "function"
              ? updaterOrValue(prev.pagination)
              : updaterOrValue,
        }));
      },
    ),
    resetTableAtom: atom(null, (get, set) =>
      set(baseAtom, initialTableStore()),
    ),
  };
};

export const sort = (sorting?: SortingState) =>
  sorting?.length
    ? sorting.map((s) => `${s.id},${s.desc ? "desc" : "asc"}`)
    : undefined;

export const columnFilters = <T>(columnFilters?: ColumnFiltersState) =>
  columnFilters?.reduce(
    (acc, filter) => ({ ...acc, [filter.id]: filter.value }),
    {} as T,
  ) || undefined;
