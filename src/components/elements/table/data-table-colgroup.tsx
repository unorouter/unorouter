"use client";

import type { TableFeats } from "@/lib/config/table-features";
import type { ReactTable, RowData } from "@tanstack/react-table";

// Columns that size to their content instead of taking a share of the width.
// A chevron toggle in a proportional column gets a whole share for one glyph.
const CONTENT_SIZED = new Set(["expand", "actions", "select"]);

// TanStack computes widths but never writes them to the DOM, so a table without
// this renders with the browser's auto layout: the last column absorbs the
// leftover width and the rest are squeezed regardless of what they hold.
// Percentages rather than pixels so the table still reflows when narrowed.
export function DataTableColgroup<TData extends RowData>(props: {
  table: ReactTable<TableFeats, TData>;
}) {
  const columns = props.table.getVisibleLeafColumns();
  const total = columns
    .filter((column) => !CONTENT_SIZED.has(column.id))
    .reduce((sum, column) => sum + column.getSize(), 0);

  return (
    <colgroup>
      {columns.map((column) => (
        <col
          key={column.id}
          style={{
            width: CONTENT_SIZED.has(column.id)
              ? "1%"
              : total > 0
                ? `${(column.getSize() / total) * 100}%`
                : undefined,
          }}
        />
      ))}
    </colgroup>
  );
}
