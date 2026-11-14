"use client";

import type { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useAtomValue, useSetAtom } from "jotai";

export function useLogFilters(id: DataTableId) {
  const tableAtoms = createTableAtoms(id);
  const store = useAtomValue(tableAtoms.baseAtom);
  const setColumnFilters = useSetAtom(tableAtoms.columnFiltersAtom);
  const setPagination = useSetAtom(tableAtoms.paginationAtom);
  const firstPage = () => setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  return {
    store,
    handleFilterChange: (filterId: string, value: unknown) => {
      setColumnFilters((prev: ColumnFiltersState) => {
        const next = prev.filter((f) => f.id !== filterId);
        if (value != null) next.push({ id: filterId, value });
        return next;
      });
      firstPage();
    },
    handleReset: () => {
      setColumnFilters([]);
      firstPage();
    },
  };
}
