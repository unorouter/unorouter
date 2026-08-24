"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReactTable, RowData } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";

interface DataTableViewOptionsProps<TData extends RowData> {
  table: ReactTable<TableFeats, TData>;
}

export function DataTableViewOptions<TData extends RowData>(
  props: DataTableViewOptionsProps<TData>,
) {
  const t = useTranslations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="h-8" />}
      >
        <Icon name="settings-2" className="mr-2 h-4 w-4" />
        View
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {props.table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => {
            const meta = column.columnDef.meta;
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {meta?.title ? t(meta.title) : column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
