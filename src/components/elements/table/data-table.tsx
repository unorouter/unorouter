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
  /* eslint-disable @typescript-eslint/no-unused-vars -- augmentation must repeat the library's exact type parameters */
  interface ColumnMeta<
    TFeatures extends TableFeatures,
    TData extends RowData,
    TValue,
  > {
    title?: TranslationKey;
    headerClassName?: string;
    cellClassName?: string;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
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
  /** CSS top at which the column header pins while the page scrolls. */
  stickyHeaderTop?: string;
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
  const headScrollRef = useRef<HTMLDivElement>(null);
  const bodyTableRef = useRef<HTMLTableElement>(null);
  const [headWidths, setHeadWidths] = useState<{
    table: number;
    cells: number[];
  }>();

  const table = useTable<TableFeats, TData>({
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

  // The body scrolls sideways, and a sticky cell cannot leave its scroll
  // container, so the visible header lives outside it and copies the widths a
  // zero-height header row inside the body table lays out.
  useEffect(() => {
    const bodyTable = bodyTableRef.current;
    if (!props.stickyHeaderTop || !bodyTable) return;
    const measure = () => {
      const sizers = bodyTable.querySelectorAll<HTMLElement>(
        "thead th[data-sizer]",
      );
      setHeadWidths({
        table: bodyTable.offsetWidth,
        cells: Array.from(sizers, (th) => th.getBoundingClientRect().width),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bodyTable);
    bodyTable
      .querySelectorAll("thead th[data-sizer]")
      .forEach((th) => observer.observe(th));
    return () => observer.disconnect();
  }, [props.stickyHeaderTop]);

  function renderHeaderRows(sizer: boolean) {
    return table.getHeaderGroups().map((headerGroup) => (
      <TableRow
        key={headerGroup.id}
        className={cn("hover:bg-transparent", sizer && "border-0")}
      >
        {headerGroup.headers.map((header, index) => {
          const meta = header.column.columnDef.meta;
          const width = sizer ? undefined : headWidths?.cells[index];
          return (
            <TableHead
              key={header.id}
              colSpan={header.colSpan}
              data-sizer={sizer || undefined}
              aria-hidden={sizer || undefined}
              inert={sizer || undefined}
              style={
                width === undefined
                  ? undefined
                  : { width, minWidth: width, maxWidth: width }
              }
              className={cn(
                "text-muted-foreground font-mono text-[10px] tracking-widest uppercase",
                meta?.headerClassName,
                sizer && "h-0 py-0",
              )}
            >
              {header.isPlaceholder ? null : sizer ? (
                <div className="h-0 overflow-hidden">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </div>
              ) : (
                flexRender(header.column.columnDef.header, header.getContext())
              )}
            </TableHead>
          );
        })}
      </TableRow>
    ));
  }

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

  const body = (
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
              <span className="text-muted-foreground text-sm">No results.</span>
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
  );

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

      {props.stickyHeaderTop ? (
        <div ref={tableContainerRef} className="border-border border">
          <div
            ref={headScrollRef}
            className="scroll-surface border-border sticky z-10 overflow-hidden border-b"
            style={{ top: props.stickyHeaderTop }}
          >
            <table
              className="table-fixed caption-bottom text-sm"
              style={{ width: headWidths?.table }}
            >
              <TableHeader className="[&_tr]:border-0">
                {renderHeaderRows(false)}
              </TableHeader>
            </table>
          </div>
          <div
            className="relative w-full overflow-x-auto"
            onScroll={(e) => {
              if (headScrollRef.current)
                headScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
            }}
          >
            <table ref={bodyTableRef} className="w-full caption-bottom text-sm">
              <DataTableColgroup table={table} />
              <TableHeader className="[&_tr]:border-0">
                {renderHeaderRows(true)}
              </TableHeader>
              {body}
            </table>
          </div>
        </div>
      ) : (
        <div
          ref={tableContainerRef}
          className="border-border overflow-hidden border"
        >
          <Table>
            <DataTableColgroup table={table} />
            <TableHeader>{renderHeaderRows(false)}</TableHeader>
            {body}
          </Table>
        </div>
      )}

      {(props.total ?? 0) > 0 && (
        <DataTablePagination table={table} total={props.total} />
      )}
    </div>
  );
}
