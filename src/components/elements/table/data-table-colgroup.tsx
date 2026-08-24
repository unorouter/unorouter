"use client";

import type { TableFeats } from "@/lib/config/table-features";
import type { ReactTable, RowData } from "@tanstack/react-table";

const CONTENT_SIZED = new Set(["expand", "actions", "select"]);

// TanStack computes column widths but never writes them to the DOM; without this
// the table silently falls back to the browser's auto layout.
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
