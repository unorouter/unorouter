"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Table } from "@tanstack/react-table";
import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
} from "react-icons/lu";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  total?: number;
}

export function DataTablePagination<TData>(
  props: DataTablePaginationProps<TData>,
) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-muted-foreground flex-1 font-mono text-xs">
        {props.total ?? 0} total
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Rows</span>
          <Select
            value={`${props.table.getState().pagination.pageSize}`}
            onValueChange={(value) => props.table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue
                placeholder={props.table.getState().pagination.pageSize}
              />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-muted-foreground font-mono text-xs">
          {props.table.getState().pagination.pageIndex + 1} /{" "}
          {props.table.getPageCount()}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-xs"
            className="hidden lg:flex"
            onClick={() => props.table.setPageIndex(0)}
            disabled={!props.table.getCanPreviousPage()}
          >
            <LuChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => props.table.previousPage()}
            disabled={!props.table.getCanPreviousPage()}
          >
            <LuChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => props.table.nextPage()}
            disabled={!props.table.getCanNextPage()}
          >
            <LuChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            className="hidden lg:flex"
            onClick={() =>
              props.table.setPageIndex(props.table.getPageCount() - 1)
            }
            disabled={!props.table.getCanNextPage()}
          >
            <LuChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
