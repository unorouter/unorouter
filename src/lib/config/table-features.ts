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

// v9 makes features opt-in per table. Every DataTable shares this one set, so
// TableFeats is the single TFeatures argument threaded through the generics.
export const tableFeatures = {
  columnFilteringFeature,
  // Only makes column.getSize() exist; the width still has to be written to the
  // DOM, which DataTable does with a colgroup. A column that declares no size
  // resolves to the library default (150), so a table where none do keeps the
  // browser's even split.
  columnSizingFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
};

// Row-model factories live in the same `features` object as the features
// themselves. Which ones a table registers stays per-table, so the slots are
// declared optional here rather than baked into the shared value.
export type TableFeats = typeof tableFeatures & {
  coreRowModel?: ReturnType<typeof createCoreRowModel>;
  expandedRowModel?: ReturnType<typeof createExpandedRowModel>;
  paginatedRowModel?: ReturnType<typeof createPaginatedRowModel>;
  sortedRowModel?: ReturnType<typeof createSortedRowModel>;
};
