"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import type { TranslationKey } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import type { Column, RowData } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
import { useTranslations } from "next-intl";

interface DataTableColumnHeaderProps<
  TData extends RowData,
  TValue,
> extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  column: Column<TableFeats, TData, TValue>;
  title: TranslationKey;
}

export function DataTableColumnHeader<TData extends RowData, TValue>(
  props: DataTableColumnHeaderProps<TData, TValue>,
) {
  const t = useTranslations();
  const sorted = props.column.getIsSorted();

  if (!props.column.getCanSort()) {
    return <div className={cn(props.className)}>{t(props.title)}</div>;
  }

  return (
    <div className={cn("flex items-center", props.className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="data-popup-open:bg-accent -ml-2 h-8 font-mono text-xs"
            />
          }
        >
          <span>{t(props.title)}</span>
          <Icon
            name={
              sorted === "desc"
                ? "arrow-down"
                : sorted === "asc"
                  ? "arrow-up"
                  : "arrow-up-down"
            }
            className={cn("ml-1.5 h-3.5 w-3.5", !sorted && "opacity-40")}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto">
          <DropdownMenuItem onClick={() => props.column.toggleSorting(false)}>
            <Icon
              name="arrow-up"
              className="text-muted-foreground mr-2 h-3.5 w-3.5"
            />
            {t("MODELS.TABLE.SORT_ASC")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => props.column.toggleSorting(true)}>
            <Icon
              name="arrow-down"
              className="text-muted-foreground mr-2 h-3.5 w-3.5"
            />
            {t("MODELS.TABLE.SORT_DESC")}
          </DropdownMenuItem>
          {sorted && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => props.column.clearSorting()}>
                <Icon
                  name="x-circle"
                  className="text-muted-foreground mr-2 h-3.5 w-3.5"
                />
                {t("MODELS.TABLE.SORT_RESET")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
