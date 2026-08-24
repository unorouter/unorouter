"use client";

import { DataTableColgroup } from "@/components/elements/table/data-table-colgroup";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type TableFeats, tableFeatures } from "@/lib/config/table-features";
import { DataTableId } from "@/lib/types/enums";
import { cn } from "@/lib/utils";
import { createTableAtoms } from "@/store/data-table-store";
import {
  type ColumnDef,
  type Row,
  type RowData,
  type ReactTable,
  type TableFeatures,
  type TableState,
  createCoreRowModel,
  createExpandedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  useTable,
} from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useAtomValue, useSetAtom } from "jotai";
import React, { type ReactNode, useEffect, useRef, useState } from "react";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";
import type { TranslationKey } from "@/lib/config/constants";

declare module "@tanstack/react-table" {
  interface ColumnMeta<
    TFeatures extends TableFeatures,
    TData extends RowData,
    TValue,
  > {
    title?: TranslationKey;
    headerClassName?: string;
    cellClassName?: string;
  }
}

interface DataTableProps<TData extends RowData> {
  id: DataTableId;
  data: TData[];
  columns: ColumnDef<TableFeats, TData>[];
  total?: number;
  tableStore?: Partial<TableState<TableFeats>>;
  columnVisibility?: boolean;
  localSorting?: boolean;
  windowVirtual?: boolean;
  estimateRowHeight?: number;
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: Row<TableFeats, TData>) => string | undefined;
  filter?: (props: { table: ReactTable<TableFeats, TData> }) => ReactNode;
  actions?: (props: { table: ReactTable<TableFeats, TData> }) => ReactNode;
  renderExpandedRow?: (row: Row<TableFeats, TData>) => ReactNode;
  getRowCanExpand?: (row: Row<TableFeats, TData>) => boolean;
}

export function DataTable<TData extends RowData>(props: DataTableProps<TData>) {
  const tableAtoms = createTableAtoms(props.id, props.tableStore);

  const store = useAtomValue(tableAtoms.baseAtom);
  const setGlobalFilter = useSetAtom(tableAtoms.globalFilterAtom);
  const setColumnVisibility = useSetAtom(tableAtoms.columnVisibilityAtom);
  const setColumnFilters = useSetAtom(tableAtoms.columnFiltersAtom);
  const setSorting = useSetAtom(tableAtoms.sortingAtom);
  const setPagination = useSetAtom(tableAtoms.paginationAtom);
  const [expanded, setExpanded] = useState({});
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const table = useTable<TableFeats, TData>({
    // v9 registers row models as slots on `features`, next to the feature objects.
    features: {
      ...tableFeatures,
      coreRowModel: createCoreRowModel(),
      ...(props.total !== undefined
        ? { paginatedRowModel: createPaginatedRowModel() }
        : {}),
      ...(props.localSorting ? { sortedRowModel: createSortedRowModel() } : {}),
      ...(props.renderExpandedRow
        ? { expandedRowModel: createExpandedRowModel() }
        : {}),
    },
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
  // The window virtualizer renders no rows until it can measure, so SSR HTML
  // held an empty tbody and the table only painted after hydration (late LCP
  // on /models). Render the first screenful statically until mount.
  /* eslint-disable react-hooks/set-state-in-effect -- mount latch, see above */
  const [virtualReady, setVirtualReady] = useState(false);
  useEffect(() => {
    if (props.windowVirtual) setVirtualReady(true);
  }, [props.windowVirtual]);
  /* eslint-enable react-hooks/set-state-in-effect */
  /* eslint-disable react-hooks/refs -- offsetTop seeds the initial scroll margin; the virtualizer re-measures after mount */
  const virtualizer = useWindowVirtualizer({
    count: props.windowVirtual ? rows.length : 0,
    estimateSize: () => props.estimateRowHeight ?? 53,
    overscan: 8,
    scrollMargin: tableContainerRef.current?.offsetTop ?? 0,
  });
  /* eslint-enable react-hooks/refs */
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
            props.rowClassName?.(row),
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
            const meta = cell.column.columnDef.meta;
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
          <DataTableColgroup table={table} />
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
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

            {!props.isLoading &&
              props.windowVirtual &&
              rows.length > 0 &&
              (virtualReady ? (
                <>
                  {paddingTop > 0 && (
                    <tr aria-hidden style={{ height: paddingTop }} />
                  )}
                  {virtualRows.map((vr) => renderRow(rows[vr.index]))}
                  {paddingBottom > 0 && (
                    <tr aria-hidden style={{ height: paddingBottom }} />
                  )}
                </>
              ) : (
                rows.slice(0, 25).map((row) => renderRow(row))
              ))}
          </TableBody>
        </Table>
      </div>

      {(props.total ?? 0) > 0 && (
        <DataTablePagination table={table} total={props.total} />
      )}
    </div>
  );
}
