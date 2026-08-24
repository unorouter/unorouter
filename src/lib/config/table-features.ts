import {
  columnFilteringFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createCoreRowModel,
  createExpandedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
} from "@tanstack/react-table";

// v9 makes features opt-in per table; every DataTable shares this one set.
export const tableFeatures = {
  columnFilteringFeature,
  // Only makes column.getSize() exist; DataTable writes the width via colgroup.
  // A column declaring no size resolves to the library default (150).
  columnSizingFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
};

// Row-model factories live in the same `features` object as the features
// themselves, but which ones a table registers is per-table.
export type TableFeats = typeof tableFeatures & {
  coreRowModel?: ReturnType<typeof createCoreRowModel>;
  expandedRowModel?: ReturnType<typeof createExpandedRowModel>;
  paginatedRowModel?: ReturnType<typeof createPaginatedRowModel>;
  sortedRowModel?: ReturnType<typeof createSortedRowModel>;
};
