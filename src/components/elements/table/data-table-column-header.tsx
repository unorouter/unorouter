"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TranslationKey } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import type { Column } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import {
  LuArrowDown,
  LuArrowUp,
  LuArrowUpDown,
  LuEyeOff,
} from "react-icons/lu";

interface DataTableColumnHeaderProps<TData, TValue> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  column: Column<TData, TValue>;
}

export function DataTableColumnHeader<TData, TValue>(
  props: DataTableColumnHeaderProps<TData, TValue>,
) {
  const t = useTranslations();

  const meta = props.column.columnDef.meta as { title?: TranslationKey };
  const titleText = meta?.title ? t(meta.title) : props.column.id;

  if (!props.column.getCanSort()) {
    return <div className={cn(props.className)}>{titleText}</div>;
  }

  return (
    <div className={cn("flex items-center space-x-2", props.className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="data-popup-open:bg-accent -ml-3 h-8"
            />
          }
        >
          <span>{titleText}</span>
          <span>
            {props.column.getIsSorted() === "desc" ? (
              <LuArrowDown className="ml-2 h-4 w-4" />
            ) : props.column.getIsSorted() === "asc" ? (
              <LuArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <LuArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => props.column.toggleSorting(false)}>
            <LuArrowUp className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => props.column.toggleSorting(true)}>
            <LuArrowDown className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            Desc
          </DropdownMenuItem>
          {props.column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => props.column.toggleVisibility(false)}
              >
                <LuEyeOff className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
                Hide
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
