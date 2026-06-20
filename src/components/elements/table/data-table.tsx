"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableId } from "@/lib/types/enums";
import { cn } from "@/lib/utils";
import { createTableAtoms } from "@/store/data-table-store";
import {
  type ColumnDef,
  type Row,
  type Table as TTable,
  type TableState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useAtomValue, useSetAtom } from "jotai";
import React, { type ReactNode, useRef, useState } from "react";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";

type Meta = {
  title?: string;
  headerClassName?: string;
  cellClassName?: string;
};

interface DataTableProps<TData, TValue> {
  id: DataTableId;
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  total?: number;
  tableStore?: Partial<TableState>;
  columnVisibility?: boolean;
  /** Client-side sort + pagination over the full `data` (no server round-trip). */
  localSorting?: boolean;
  /** Window-scroll row virtualization for large client lists (incompatible with expanded rows). */
  windowVirtual?: boolean;
  /** Estimated row height in px for the virtualizer (default 53). */
  estimateRowHeight?: number;
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: TData) => void;
  filter?: (props: { table: TTable<TData> }) => ReactNode;
  actions?: (props: { table: TTable<TData> }) => ReactNode;
  renderExpandedRow?: (row: Row<TData>) => ReactNode;
  getRowCanExpand?: (row: Row<TData>) => boolean;
}

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  const tableAtoms = createTableAtoms(props.id, props.tableStore);

  const store = useAtomValue(tableAtoms.baseAtom);
  const setGlobalFilter = useSetAtom(tableAtoms.globalFilterAtom);
  const setColumnVisibility = useSetAtom(tableAtoms.columnVisibilityAtom);
  const setColumnFilters = useSetAtom(tableAtoms.columnFiltersAtom);
  const setSorting = useSetAtom(tableAtoms.sortingAtom);
  const setPagination = useSetAtom(tableAtoms.paginationAtom);
  const [expanded, setExpanded] = useState({});
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data: props.data,
    columns: props.columns,
    state: {
      globalFilter: store.globalFilter,
      columnVisibility: store.columnVisibility,
      columnFilters: store.columnFilters,
      sorting: store.sorting,
      pagination: store.pagination,
      expanded,
    },
    rowCount: props.total,
    pageCount: props.total
      ? Math.ceil(props.total / store.pagination.pageSize)
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    // No `total` => client list shows ALL rows (no pagination, no row cap).
    ...(props.total !== undefined
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    ...(props.localSorting ? { getSortedRowModel: getSortedRowModel() } : {}),
    ...(props.renderExpandedRow
      ? { getExpandedRowModel: getExpandedRowModel() }
      : {}),
    getRowCanExpand: props.getRowCanExpand,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: !props.localSorting,
    manualSorting: !props.localSorting,
    manualFiltering: !props.localSorting,
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useWindowVirtualizer({
    count: props.windowVirtual ? rows.length : 0,
    estimateSize: () => props.estimateRowHeight ?? 53,
    overscan: 8,
    scrollMargin: tableContainerRef.current?.offsetTop ?? 0,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const scrollMargin = virtualizer.options.scrollMargin;
  const paddingTop =
    virtualRows.length > 0 ? virtualRows[0].start - scrollMargin : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? virtualizer.getTotalSize() -
        (virtualRows[virtualRows.length - 1].end - scrollMargin)
      : 0;

  function renderRow(row: (typeof rows)[number]) {
    const canExpand = props.renderExpandedRow && row.getCanExpand();
    return (
      <React.Fragment key={row.id}>
        <TableRow
          className={cn(
            (canExpand || props.onRowClick) && "cursor-pointer",
            row.getIsExpanded() && "bg-muted/30",
          )}
          onClick={
            canExpand
              ? () => row.toggleExpanded()
              : props.onRowClick
                ? () => props.onRowClick!(row.original)
                : undefined
          }
        >
          {row.getVisibleCells().map((cell) => {
            const meta = cell.column.columnDef.meta as Meta;
            return (
              <TableCell key={cell.id} className={cn(meta?.cellClassName)}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            );
          })}
        </TableRow>
        {row.getIsExpanded() && props.renderExpandedRow && (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={row.getVisibleCells().length}
              className="bg-muted/20 p-0"
            >
              {props.renderExpandedRow(row)}
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {(props.columnVisibility || props.filter || props.actions) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {props.filter?.({ table })}
          </div>
          <div className="flex items-center gap-2">
            {props.actions?.({ table })}
            {props.columnVisibility && <DataTableViewOptions table={table} />}
          </div>
        </div>
      )}

      <div
        ref={tableContainerRef}
        className="border-border overflow-hidden border"
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as Meta;
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "text-muted-foreground font-mono text-[10px] tracking-widest uppercase",
                        meta?.headerClassName,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {props.isLoading && (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {props.columns.map((_, j) => (
                      <TableCell key={`skeleton-${i}-${j}`}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}

            {!props.isLoading && table.getRowModel().rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={props.columns.length}
                  className="h-40 text-center"
                >
                  {props.emptyState ?? (
                    <span className="text-muted-foreground text-sm">
                      No results.
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )}

            {!props.isLoading &&
              !props.windowVirtual &&
              rows.map((row) => renderRow(row))}

            {!props.isLoading && props.windowVirtual && rows.length > 0 && (
              <>
                {paddingTop > 0 && (
                  <tr aria-hidden style={{ height: paddingTop }} />
                )}
                {virtualRows.map((vr) => renderRow(rows[vr.index]))}
                {paddingBottom > 0 && (
                  <tr aria-hidden style={{ height: paddingBottom }} />
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {(props.total ?? 0) > 0 && (
        <DataTablePagination table={table} total={props.total} />
      )}
    </div>
  );
}
