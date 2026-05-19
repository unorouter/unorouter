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
import type { WritableAtom } from "jotai";
import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { atomWithStorage } from "jotai/utils";

export type DataTableStore = {
  globalFilter: string;
  rowSelection: RowSelectionState;
  columnVisibility: VisibilityState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  pagination: PaginationState;
};

export type DataTableStores = Record<DataTableId, DataTableStore>;

export const dataTableStorageAtom = atomWithStorage<Partial<DataTableStores>>(
  StoreId.DATA_TABLES_STORE,
  {},
  jotaiCookieStorage,
);

const dataTableAtomFamily = atomFamily((id: DataTableId) =>
  atom<
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
  ),
);

type TableUpdate =
  | Partial<DataTableStore>
  | ((prev: DataTableStore) => DataTableStore);
type BaseAtom = WritableAtom<DataTableStore, [TableUpdate], void>;

function buildFieldAtoms(
  base: BaseAtom,
  initialValues?: Partial<DataTableStore>,
) {
  function fieldAtom<T>(
    selector: (s: DataTableStore) => T,
    updater: (prev: DataTableStore, value: T) => DataTableStore,
  ) {
    return atom(
      (get) => selector(get(base)),
      (_get, set, updaterOrValue: T | ((prev: T) => T)) => {
        set(base, (prev) => {
          const resolved =
            typeof updaterOrValue === "function"
              ? (updaterOrValue as (prev: T) => T)(selector(prev))
              : updaterOrValue;
          return updater(prev, resolved);
        });
      },
    );
  }

  return {
    baseAtom: base,
    globalFilterAtom: fieldAtom<string>(
      (s) => s.globalFilter,
      (prev, v) => ({
        ...prev,
        globalFilter: v,
        pagination: { ...prev.pagination, pageIndex: 0 },
      }),
    ),
    rowSelectionAtom: fieldAtom<RowSelectionState>(
      (s) => s.rowSelection,
      (prev, v) => ({ ...prev, rowSelection: v }),
    ),
    columnVisibilityAtom: fieldAtom<VisibilityState>(
      (s) => s.columnVisibility,
      (prev, v) => ({ ...prev, columnVisibility: v }),
    ),
    columnFiltersAtom: fieldAtom<ColumnFiltersState>(
      (s) => s.columnFilters,
      (prev, v) => ({ ...prev, columnFilters: v }),
    ),
    sortingAtom: fieldAtom<SortingState>(
      (s) => s.sorting,
      (prev, v) => ({ ...prev, sorting: v }),
    ),
    paginationAtom: fieldAtom<PaginationState>(
      (s) => s.pagination,
      (prev, v) => ({ ...prev, pagination: v }),
    ),
    resetTableAtom: atom(null, (_get, set) =>
      set(base, initialTableStore(initialValues)),
    ),
  };
}

export const createTableAtoms = (
  id: DataTableId,
  initialValues?: Partial<DataTableStore>,
) => buildFieldAtoms(dataTableAtomFamily(id), initialValues);


export const columnFilters = <T extends Record<string, unknown>>(
  columnFilters?: ColumnFiltersState,
) =>
  columnFilters?.reduce<T>(
    (acc, filter) => ({ ...acc, [filter.id]: filter.value }),
    // SAFETY: accumulator is built up by reduce, starts empty
    {} as T,
  ) || undefined;
