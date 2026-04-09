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
  useReactTable,
} from "@tanstack/react-table";
import { useAtomValue, useSetAtom } from "jotai";
import React, { type ReactNode, useState } from "react";
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
  isLoading?: boolean;
  emptyState?: ReactNode;
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
  const setPagination = useSetAtom(tableAtoms.paginationAtom);
  const [expanded, setExpanded] = useState({});

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table known React Compiler limitation
  const table = useReactTable({
    data: props.data,
    columns: props.columns,
    state: {
      globalFilter: store.globalFilter,
      columnVisibility: store.columnVisibility,
      columnFilters: store.columnFilters,
      pagination: store.pagination,
      expanded,
    },
    rowCount: props.total,
    pageCount: props.total
      ? Math.ceil(props.total / store.pagination.pageSize)
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    ...(props.renderExpandedRow
      ? { getExpandedRowModel: getExpandedRowModel() }
      : {}),
    getRowCanExpand: props.getRowCanExpand,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualFiltering: true,
  });

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

      <div className="border-border overflow-hidden border">
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
              table.getRowModel().rows.map((row) => {
                const canExpand = props.renderExpandedRow && row.getCanExpand();
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        canExpand && "cursor-pointer",
                        row.getIsExpanded() && "bg-muted/30",
                      )}
                      onClick={
                        canExpand ? () => row.toggleExpanded() : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as Meta;
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(meta?.cellClassName)}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
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
              })}
          </TableBody>
        </Table>
      </div>

      {(props.total ?? 0) > 0 && (
        <DataTablePagination table={table} total={props.total} />
      )}
    </div>
  );
}
