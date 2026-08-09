import {
  columnFilteringFeature,
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
