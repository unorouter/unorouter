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
import type { TranslationKey } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import {
  type ColumnDef,
  type PaginationState,
  type Table as TTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";

type Meta = {
  title?: TranslationKey;
  headerClassName?: string;
  cellClassName?: string;
};

interface DataTableProps<TData, TValue> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  total?: number;
  pageIndex?: number;
  pageSize?: number;
  onPaginationChange?: (pagination: PaginationState) => void;
  columnVisibility?: boolean;
  isLoading?: boolean;
  emptyState?: ReactNode;
  filter?: (props: { table: TTable<TData> }) => ReactNode;
  actions?: (props: { table: TTable<TData> }) => ReactNode;
}

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  const t = useTranslations();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: props.pageIndex ?? 0,
    pageSize: props.pageSize ?? 10,
  });

  const table = useReactTable({
    data: props.data,
    columns: props.columns,
    state: {
      columnVisibility,
      pagination,
    },
    rowCount: props.total,
    pageCount: props.total
      ? Math.ceil(props.total / pagination.pageSize)
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      setPagination(next);
      props.onPaginationChange?.(next);
    },
    manualPagination: true,
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
                            typeof header.column.columnDef.header === "string"
                              ? t(
                                  header.column.columnDef
                                    .header as TranslationKey,
                                )
                              : header.column.columnDef.header,
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
